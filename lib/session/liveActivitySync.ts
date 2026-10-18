import { AppState } from "react-native";

import { type LiveActivityState, liveActivity } from "../../modules/swayt-live-activity";
import { type ExerciseLog, useWorkoutSessionStore } from "../../store/workoutSessionStore";

// 진행 중인 운동 스토어와 Live Activity를 맞춘다. 규칙은 하나다:
// "진행 중인 실제 세션이 있을 때만 떠 있고, 끝나면(완료·중간 종료·정리) 바로 사라진다."
// 개별 화면이 start/end를 부르지 않고 스토어 변화를 구독하게 한 이유: 운동이 끝나는 경로가 여럿이라
// (정상 완료, 빈 세션 폐기, 복원 가드의 정리, 요약 확인) 호출을 흩어 두면 하나만 빠져도 유령이 남는다.
// 모든 실패는 삼킨다 — Live Activity가 안 되는 기기·권한 거부여도 운동 기록 흐름은 계속돼야 한다.

type Snapshot = { sessionName: string; state: LiveActivityState };

// 지금 보여줄 종목: 타이머가 흐르는 종목 > 처음 안 끝난 종목 > (전부 끝났으면) 마지막 종목
function pickCurrentLog(logs: ExerciseLog[]): ExerciseLog {
  return (
    logs.find((log) => log.setStartedAt || log.durationStartedAt) ??
    logs.find((log) => !log.completed) ??
    logs[logs.length - 1]
  );
}

// 시각처럼 매번 달라지는 값(마지막 갱신 시각)은 비교 키에서 빼야 같은 화면을 반복 갱신하지 않는다.
function stateKey(snapshot: Snapshot | null): string {
  if (!snapshot) return "null";
  const { lastUpdatedMs: _ignored, ...rest } = snapshot.state;
  return JSON.stringify({ name: snapshot.sessionName, ...rest });
}

function takeSnapshot(): Snapshot | null {
  const { sessionId, isRealSession, isFinished, logs, sessionTitle } = useWorkoutSessionStore.getState();
  // 실제 세션이 아닌 폴백 기록은 서버에 없는 운동이라 띄우지 않는다.
  if (!sessionId || !isRealSession || isFinished || logs.length === 0) return null;

  const allDone = logs.every((log) => log.completed);
  const log = pickCurrentLog(logs);
  const isCardio = log.isCardio ?? false;
  const completedSets = log.setTimings.length;
  const accumulatedSeconds = Number(log.actualDurationSeconds) || 0;
  const totalCompletedSets = logs.reduce((sum, item) => sum + item.setTimings.length, 0);

  let phase: LiveActivityState["phase"];
  let timerStartMs: number | null = null;
  if (allDone) {
    phase = "awaitingFinish";
  } else if (isCardio) {
    if (log.durationStartedAt) {
      phase = "running";
      // 이미 쌓인 시간을 빼서 "가상 시작 시각"을 만든다 — 위젯이 시작 시각 하나만으로 총 경과 시간을 올려 그린다.
      timerStartMs = Date.parse(log.durationStartedAt) - accumulatedSeconds * 1000;
    } else {
      phase = accumulatedSeconds > 0 ? "paused" : "waiting";
    }
  } else if (log.setStartedAt) {
    phase = "running";
    timerStartMs = Date.parse(log.setStartedAt);
  } else {
    phase = "waiting";
  }

  return {
    sessionName: sessionTitle || "운동",
    state: {
      phase,
      isCardio,
      exerciseName: log.name,
      exerciseIndex: logs.indexOf(log) + 1,
      exerciseCount: logs.length,
      setNumber: completedSets + 1,
      totalSets: Math.max(log.targetSets, completedSets, 1),
      completedSets,
      targetReps: log.targetReps,
      targetWeight: log.targetWeight,
      targetMinutes: Math.round(log.targetDurationSeconds / 60),
      timerStartMs,
      pausedSeconds: accumulatedSeconds,
      totalCompletedSets,
      lastUpdatedMs: Date.now(),
    },
  };
}

let activityId: string | null = null;
let lastKey = "";
// start/update/end가 겹쳐 실행되면 같은 운동에 Activity가 둘 생길 수 있어 한 줄로 세운다.
let queue: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>) {
  queue = queue.then(task).catch(() => {});
}

async function apply(snapshot: Snapshot | null): Promise<void> {
  if (!snapshot) {
    // 우리 변수에 id가 없어도(앱이 다시 켜진 경우) OS에 남은 것이 있으면 모두 끈다.
    if (activityId || liveActivity.activeIds().length > 0) await liveActivity.end(null);
    activityId = null;
    return;
  }
  if (!activityId) {
    const existing = liveActivity.activeIds();
    if (existing.length === 1) {
      // 앱이 꺼졌다 켜져도 Activity는 OS에 남아 있다 — 새로 만들지 않고 이어서 쓴다.
      activityId = existing[0];
    } else if (existing.length > 1) {
      await liveActivity.end(null);
    }
  }
  if (activityId) {
    await liveActivity.update(activityId, snapshot.state);
    return;
  }
  activityId = await liveActivity.start(snapshot.sessionName, snapshot.state);
}

function sync(force = false) {
  const { persist } = useWorkoutSessionStore;
  // 저장된 세션 복원이 끝나기 전의 스토어는 비어 있다. 그 상태로 맞추면 복원될 진행 중 운동의
  // Live Activity를 잘못 꺼버리므로 복원 완료 뒤에만 동작한다.
  if (!persist.hasHydrated()) return;
  const snapshot = takeSnapshot();
  const key = stateKey(snapshot);
  if (!force && key === lastKey) return;
  lastKey = key;
  enqueue(() => apply(snapshot));
}

// 앱 전체에서 한 번만 호출한다(탭 레이아웃). 해제 함수를 돌려준다.
export function startLiveActivitySync(): () => void {
  const { persist } = useWorkoutSessionStore;
  lastKey = "";
  const unsubscribeStore = useWorkoutSessionStore.subscribe(() => sync());
  const unsubscribeHydration = persist.onFinishHydration(() => sync());
  // 앱을 켠 직후와 포그라운드로 돌아올 때, 진행 중인 운동이 없는데 남아 있는 Live Activity(유령)를 정리한다.
  const appStateSubscription = AppState.addEventListener("change", (next) => {
    if (next === "active" && persist.hasHydrated() && !takeSnapshot()) sync(true);
  });
  sync(true);
  return () => {
    unsubscribeStore();
    unsubscribeHydration();
    appStateSubscription.remove();
  };
}
