import { AppState } from "react-native";

import { apiClient } from "../api/client";
import { liveActivity } from "../../modules/swayt-live-activity";
import { type ExerciseLog, useWorkoutSessionStore } from "../../store/workoutSessionStore";

// 진행 중인 운동 스토어와 Live Activity를 맞춘다. 규칙은 하나다:
// "진행 중인 실제 세션이 있을 때만 떠 있고, 끝나면(완료·중간 종료·정리) 바로 사라진다."
// 개별 화면이 start/end를 부르지 않고 스토어 변화를 구독하게 한 이유: 운동이 끝나는 경로가 여럿이라
// (정상 완료, 빈 세션 폐기, 복원 가드의 정리, 요약 확인) 호출을 흩어 두면 하나만 빠져도 유령이 남는다.
// 화면 상태 계산과 Live Activity 조작은 네이티브(WorkoutActivityController)가 맡는다 — 앱이 꺼진 채 위젯 버튼으로
// 기록이 바뀌어도 같은 코드가 화면을 다시 그려야 하기 때문이다. 여기서는 plan(진행 중 기록)을 넘기기만 한다.
// 모든 실패는 삼킨다 — Live Activity가 안 되는 기기·권한 거부여도 운동 기록 흐름은 계속돼야 한다.

type PlanSnapshot = {
  sessionId: string;
  isRealSession: boolean;
  isFinished: boolean;
  logs: ExerciseLog[];
  expandedId: string | null;
  scheduledOriginSessionId: string | null;
  sessionTitle: string;
};

// 진행 중인 실제 운동이 있으면 plan(JSON 문자열), 없으면 null.
function takePlanJson(): string | null {
  const state = useWorkoutSessionStore.getState();
  // 실제 세션이 아닌 폴백 기록은 서버에 없는 운동이라 띄우지 않는다.
  if (!state.sessionId || !state.isRealSession || state.isFinished || state.logs.length === 0) return null;
  const plan: PlanSnapshot = {
    sessionId: state.sessionId,
    isRealSession: state.isRealSession,
    isFinished: state.isFinished,
    logs: state.logs,
    expandedId: state.expandedId,
    scheduledOriginSessionId: state.scheduledOriginSessionId,
    sessionTitle: state.sessionTitle,
  };
  return JSON.stringify(plan);
}

let lastKey = "";
// 호출이 겹치면 같은 운동에 Activity가 둘 생길 수 있어 한 줄로 세운다.
let queue: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>) {
  queue = queue.then(task).catch(() => {});
}

function sync(force = false) {
  const { persist } = useWorkoutSessionStore;
  // 저장된 세션 복원이 끝나기 전의 스토어는 비어 있다. 그 상태로 맞추면 복원될 진행 중 운동의
  // Live Activity를 잘못 꺼버리므로 복원 완료 뒤에만 동작한다.
  if (!persist.hasHydrated()) return;
  const planJson = takePlanJson();
  const key = planJson ?? "null";
  if (!force && key === lastKey) return;
  lastKey = key;
  enqueue(() => liveActivity.syncPlan(planJson));
}

// --- 위젯 버튼이 바꾼 내용 가져오기 -------------------------------------------------------------

let lastAdoptedRev = 0;

// 새로 완료된 종목을 서버에 반영한다 — 앱 안에서 "완료로 표시"를 눌렀을 때와 같은 내용이다.
// 서버가 부분 수행·완료 경험치를 판정하려면 종목 완료 상태가 서버에 있어야 해서, 위젯으로 끝낸 종목도 보내야 한다.
async function completeLogOnServer(sessionId: string, log: ExerciseLog): Promise<void> {
  const body = log.isCardio
    ? { completed: true, actualDurationSeconds: Number(log.actualDurationSeconds) || 0 }
    : {
        completed: true,
        actualSets: Number(log.actualSets) || undefined,
        actualReps: Number(log.actualReps) || undefined,
        actualWeight: Number(log.actualWeight) || 0,
        setTimings: log.setTimings,
      };
  try {
    await apiClient.patch(`/api/v1/sessions/${sessionId}/logs/${log.id}`, body);
    liveActivity.appendDebugLog(`서버 반영 완료: ${log.name}`);
  } catch {
    // 실패해도 종료 시점(handleFinish)에 기록 있는 미완료 종목으로 다시 저장되니 흐름은 막지 않는다.
    liveActivity.appendDebugLog(`서버 반영 실패(종료 시 재시도됨): ${log.name}`);
  }
}

// 앱이 꺼져 있는 동안 위젯 버튼이 바꾼 plan을 스토어에 반영한다. 앱을 켠 직후, 앞으로 돌아올 때,
// 앱이 살아 있을 때 인텐트가 끝난 직후에 부른다. 같은 plan을 두 번 반영하지 않도록 rev를 기억한다.
function adoptWidgetChanges() {
  const raw = liveActivity.readPlan();
  if (!raw) return;
  let plan: (PlanSnapshot & { rev?: number; updatedBy?: string }) | null = null;
  try {
    plan = JSON.parse(raw);
  } catch {
    return;
  }
  if (!plan || plan.updatedBy !== "widget" || (plan.rev ?? 0) <= lastAdoptedRev) return;
  lastAdoptedRev = plan.rev ?? 0;

  const state = useWorkoutSessionStore.getState();
  if (!plan.sessionId || plan.sessionId !== state.sessionId) {
    liveActivity.appendDebugLog(`위젯 변경 무시: 세션 불일치(plan=${plan.sessionId})`);
    return;
  }
  const before = new Map(state.logs.map((log) => [log.id, log]));
  state.adoptPlanLogs(plan.logs, plan.expandedId ?? null);
  liveActivity.appendDebugLog(`위젯 변경 반영 rev=${plan.rev}`);
  for (const log of plan.logs) {
    if (log.completed && !before.get(log.id)?.completed) void completeLogOnServer(plan.sessionId, log);
  }
}

// 앱 전체에서 한 번만 호출한다(탭 레이아웃). 해제 함수를 돌려준다.
export function startLiveActivitySync(): () => void {
  const { persist } = useWorkoutSessionStore;
  lastKey = "";

  // 복원이 끝난 뒤, 앱의 오래된 저장본이 위젯의 새 기록을 덮어쓰기 전에 위젯 변경부터 가져온다.
  const begin = () => {
    adoptWidgetChanges();
    sync(true);
  };

  const unsubscribeStore = useWorkoutSessionStore.subscribe(() => sync());
  const unsubscribeHydration = persist.onFinishHydration(begin);
  const unsubscribePlanChanged = liveActivity.onPlanChanged(() => adoptWidgetChanges());
  const appStateSubscription = AppState.addEventListener("change", (next) => {
    if (next !== "active" || !persist.hasHydrated()) return;
    adoptWidgetChanges();
    // 진행 중인 운동이 없는데 남아 있는 Live Activity(유령)를 정리하고, 있으면 화면을 현재 상태로 맞춘다.
    sync(true);
  });
  if (persist.hasHydrated()) begin();
  return () => {
    unsubscribeStore();
    unsubscribeHydration();
    unsubscribePlanChanged();
    appStateSubscription.remove();
  };
}
