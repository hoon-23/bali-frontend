import { CircleCheck, CircleMinus, CirclePlus } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppAlertModal } from "../../components/AppAlertModal";
import { AppToast, AppToastData } from "../../components/AppToast";
import { AppTextInput } from "../../components/AppTextInput";
import { KeyboardDismissView, keyboardScrollProps } from "../../components/KeyboardDismissView";
import { appAlert } from "../../lib/alert";
import { getKoreanApiErrorMessage } from "../../lib/api/planLimit";
import { hasLogRecord } from "../../lib/session/logRecord";
import { loadScheduledOrigin } from "../../lib/session/scheduledOrigin";
import { sanitizeWeightInput } from "../../lib/format/numberInput";
import { cancelAllSetTimerReminders, cancelSetTimerReminder, scheduleSetTimerReminder } from "../../lib/notifications";
import { useSingleTapNavigate } from "../../lib/navigation/useSingleTapNavigate";
import { isBodyweightExercise } from "../../constants/exercises";
import { ApiExercise, formatExerciseName, isCardioExercise, useExerciseMap } from "../../hooks/api/useExercises";
import { ApiSessionDetail, useSession, useDeleteSession, usePatchSession, usePatchSessionLog } from "../../hooks/api/useSessions";
import { getTodayKstISODate } from "../../hooks/api/useUpcomingSessions";
import { ApiTemplate, useTemplate } from "../../hooks/api/useTemplates";
import {
  ActualField,
  ExerciseLog,
  SetTiming,
  useWorkoutSessionStore,
} from "../../store/workoutSessionStore";

// 토스트와 "운동 종료" 버튼 사이 간격 — 펄스(scale 1.06, 위로 약 1.5pt 확대)보다 충분히 크다.
const TOAST_GAP = 16;

// 운동 하나의 목표를 모두 채웠는지 — "완료로 표시" 버튼의 톤 결정에 쓴다.
// 유산소는 목표 시간(없으면 기록이 있는지), 근력 운동은 목표 세트 수 기준이다.
function isLogTargetReached(log: ExerciseLog, isCardio: boolean): boolean {
  if (isCardio) {
    const actual = Number(log.actualDurationSeconds) || 0;
    return log.targetDurationSeconds > 0 ? actual >= log.targetDurationSeconds : actual > 0;
  }
  return (Number(log.actualSets) || 0) >= log.targetSets;
}

// 로그 PATCH 본문 구성(완료 표시/종료 직전 flush 공용). completed는 넣지 않고 호출 쪽에서 붙인다.
// CARDIO 로그는 sets/reps/weight/setTimings가 채워져 있으면 서버가 예외를 던지므로
// (백엔드 검증 규칙) actualDurationSeconds만 보낸다.
// 맨몸 종목은 입력란이 없어도 STRENGTH 세트 규칙상 weight=0을 항상 보낸다.
// emptyWeightAsZero: 입력이 없을 때 weight를 undefined 대신 0으로 보낼지(flush용).
function buildLogPayload(
  log: ExerciseLog,
  isCardio: boolean,
  isBodyweight: boolean,
  emptyWeightAsZero = false
) {
  if (isCardio) {
    return {
      actualDurationSeconds: log.actualDurationSeconds ? Number(log.actualDurationSeconds) : undefined,
    };
  }
  return {
    actualSets: log.actualSets ? Number(log.actualSets) : undefined,
    actualReps: log.actualReps ? Number(log.actualReps) : undefined,
    actualWeight: isBodyweight
      ? 0
      : log.actualWeight
        ? Number(log.actualWeight)
        : emptyWeightAsZero
          ? 0
          : undefined,
    setTimings: log.setTimings,
  };
}

// 세션 조회가 실패했는데(삭제된 세션 등) templateId조차 없는 극히 드문 경우를 위한
// 최후의 fallback — 화면이 완전히 빈 채로 렌더링되는 것만 방지한다.
const FALLBACK_LOGS: ExerciseLog[] = [
  {
    id: "1",
    exerciseId: "e1",
    name: "벤치프레스",
    sortOrder: 0,
    targetSets: 4,
    targetReps: 10,
    targetWeight: 60,
    targetDurationSeconds: 0,
    actualSets: "0",
    actualReps: "10",
    actualWeight: "60",
    actualDurationSeconds: "0",
    completed: false,
    setTimings: [],
  },
];

function buildLogsFromApiTemplate(
  template: ApiTemplate,
  exerciseMap: Map<string, ApiExercise>
): ExerciseLog[] {
  return template.items.map((item, index) => {
    const exercise = exerciseMap.get(item.exerciseId);
    return {
      id: item.id,
      exerciseId: item.exerciseId,
      name: exercise ? formatExerciseName(exercise) : "알 수 없는 운동",
      sortOrder: index,
      targetSets: item.targetSets ?? 0,
      targetReps: item.targetReps ?? 0,
      targetWeight: item.targetWeight ?? 0,
      targetDurationSeconds: item.targetDurationSeconds ?? 0,
      // 계획과 같으면 그대로 두고, 다르면 고쳐 쓰게 목표값으로 미리 채워둔다.
      actualSets: "0",
      actualReps: String(item.targetReps ?? 0),
      actualWeight: isBodyweightExercise(exercise) ? "0" : String(item.targetWeight ?? 0),
      actualDurationSeconds: "0",
      completed: false,
      setTimings: [],
    };
  });
}

// 실제 백엔드 세션 응답을 화면 로컬 상태로 변환. logId를 그대로 써서
// PATCH .../logs/{logId} 호출 시 서버 로그와 매칭시킨다.
function buildLogsFromApiSession(
  session: ApiSessionDetail,
  exerciseMap: Map<string, ApiExercise>
): ExerciseLog[] {
  return session.logs
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((log) => {
      const exercise = exerciseMap.get(log.exerciseId);
      return {
        id: log.id,
        exerciseId: log.exerciseId,
        name: exercise ? formatExerciseName(exercise) : "알 수 없는 운동",
        sortOrder: log.sortOrder,
        targetSets: log.targetSets ?? 0,
        targetReps: log.targetReps ?? 0,
        targetWeight: log.targetWeight ?? 0,
        targetDurationSeconds: log.targetDurationSeconds ?? 0,
        actualSets: log.actualSets != null ? String(log.actualSets) : "0",
        actualReps: log.actualReps != null ? String(log.actualReps) : String(log.targetReps ?? 0),
        // 이 세션에서 아직 무게를 입력 안 했으면(actualWeight 없음) 직전에 기록한 무게를
        // 우선 채워준다 — 없으면 기존처럼 목표 무게로 채운다.
        actualWeight: isBodyweightExercise(exercise)
          ? "0"
          : log.actualWeight != null
            ? String(log.actualWeight)
            : String(log.lastWeight ?? log.targetWeight ?? 0),
        actualDurationSeconds: log.actualDurationSeconds != null ? String(log.actualDurationSeconds) : "0",
        completed: log.completed,
        setTimings: log.setTimings ?? [],
      };
    });
}

// 운동 목록 정렬 우선순위 — 진행중(세트 하나라도 기록됨, 유산소는 측정 시간 있음) > 대기(아직 손 안 댐) > 완료.
function logListPriority(log: ExerciseLog): number {
  if (log.completed) return 2;
  if (log.setTimings.length > 0 || Number(log.actualDurationSeconds) > 0) return 0;
  return 1;
}

export default function WorkoutSessionScreen() {
  const { sessionId, templateId } = useLocalSearchParams<{
    sessionId: string;
    templateId?: string;
  }>();
  const router = useRouter();

  const queryClient = useQueryClient();
  // 빈 세션을 서버에서 삭제한 뒤엔 상세 조회를 끈다 — 삭제된 id를 다시 조회해 404가 나지 않게 한다.
  const [sessionGone, setSessionGone] = useState(false);
  const { data: apiSession, isError: sessionFetchFailed } = useSession(sessionGone ? undefined : sessionId);
  const { data: fallbackTemplate } = useTemplate(templateId);
  const exerciseMap = useExerciseMap();
  const patchSession = usePatchSession();
  const patchSessionLog = usePatchSessionLog();
  const deleteSession = useDeleteSession();
  // 예정된 운동 화면에서 시작한 세션인지(예약 출신) — 빈 세션 종료 시 예약 유지 여부 판단에 쓴다.
  const scheduledOriginSessionId = useWorkoutSessionStore((state) => state.scheduledOriginSessionId);

  const storedSessionId = useWorkoutSessionStore((state) => state.sessionId);
  const isRealSession = useWorkoutSessionStore((state) => state.isRealSession);
  const logs = useWorkoutSessionStore((state) => state.logs);
  const expandedId = useWorkoutSessionStore((state) => state.expandedId);
  const startSession = useWorkoutSessionStore((state) => state.startSession);
  const appendLogs = useWorkoutSessionStore((state) => state.appendLogs);
  const setXpResult = useWorkoutSessionStore((state) => state.setXpResult);
  const setExpandedId = useWorkoutSessionStore((state) => state.setExpandedId);
  const updateField = useWorkoutSessionStore((state) => state.updateField);
  const adjustActualSets = useWorkoutSessionStore((state) => state.adjustActualSets);
  const setTargetSets = useWorkoutSessionStore((state) => state.setTargetSets);
  const recordSetTiming = useWorkoutSessionStore((state) => state.recordSetTiming);
  const completeLog = useWorkoutSessionStore((state) => state.completeLog);
  const uncompleteLog = useWorkoutSessionStore((state) => state.uncompleteLog);
  const handleAddExercisePress = useSingleTapNavigate(() =>
    router.push({ pathname: "/routines/exercise-picker", params: { sessionId } })
  );

  useEffect(() => {
    if (sessionId === useWorkoutSessionStore.getState().sessionId) return;
    // 실제 세션 조회가 성공하면 그 데이터로, 실패(404 등 — 삭제된 세션이나
    // 개발 중 남은 잘못된 링크)하면 templateId로 실제 템플릿을 다시 조립해서 폴백한다.
    if (apiSession) {
      startSession(sessionId, buildLogsFromApiSession(apiSession, exerciseMap), true);
      return;
    }
    if (sessionFetchFailed) {
      const logs = fallbackTemplate
        ? buildLogsFromApiTemplate(fallbackTemplate, exerciseMap)
        : FALLBACK_LOGS;
      startSession(sessionId, logs, false);
    }
    // apiSession/sessionFetchFailed 둘 다 아직이면(조회 중) 대기 — 다음 렌더에서 재평가됨.
  }, [sessionId, apiSession, sessionFetchFailed, fallbackTemplate, exerciseMap, startSession]);

  // 운동 중 종목을 추가하면(exercise-picker → addItems) 서버 세션엔 새 log가 생기지만,
  // 화면은 로컬 store를 그려서 보고 있어서 자동으로 안 보인다. apiSession이 갱신될 때마다
  // 로컬에 없는 log만 골라 이어붙인다 — 이미 있는 log(진행 중인 타이머 등)는 건드리지 않는다.
  useEffect(() => {
    if (!isRealSession || !apiSession || sessionId !== storedSessionId) return;
    const existingIds = new Set(logs.map((log) => log.id));
    const newApiLogs = apiSession.logs.filter((log) => !existingIds.has(log.id));
    if (newApiLogs.length === 0) return;
    appendLogs(buildLogsFromApiSession({ ...apiSession, logs: newApiLogs }, exerciseMap));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiSession, isRealSession, sessionId, storedSessionId, exerciseMap]);

  const allCompleted = logs.length > 0 && logs.every((log) => log.completed);
  const [toast, setToast] = useState<AppToastData | null>(null);
  const toastIdRef = useRef(0);
  const showToast = (message: string, actionLabel: string, onAction: () => void) => {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, message, actionLabel, onAction });
  };
  // allCompleted가 false -> true로 바뀔 때 "운동 종료" 버튼을 한 번 강조한다(transform만 사용, 레이아웃 불변).
  const finishPulse = useRef(new Animated.Value(1)).current;
  const prevAllCompletedRef = useRef(allCompleted);
  useEffect(() => {
    const was = prevAllCompletedRef.current;
    prevAllCompletedRef.current = allCompleted;
    if (!allCompleted || was) return;
    Animated.sequence([
      Animated.timing(finishPulse, { toValue: 1.06, duration: 220, useNativeDriver: true }),
      Animated.timing(finishPulse, { toValue: 1, duration: 380, useNativeDriver: true }),
    ]).start();
    return () => finishPulse.stopAnimation();
  }, [allCompleted]);
  // 컨테이너 높이와 종료 버튼 top(같은 컨테이너 기준) — 토스트 bottom 오프셋 계산용.
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const [finishTop, setFinishTop] = useState<number | null>(null);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);

  const handleClose = () => {
    router.dismissTo("/home");
  };

  // 로그 하나의 기록 여부 — 종목 정보로 유산소/맨몸을 판별한다.
  const logHasRecord = (log: ExerciseLog) =>
    hasLogRecord(log, isCardioExercise(exerciseMap.get(log.exerciseId)));

  // 종료 직전, 완료 체크 안 한 로그 중 기록이 있는 것을 서버에 저장한다(completed는 보내지 않음).
  // 서버가 부분 수행(경험치 50)을 판정하려면 미완료 종목의 기록도 서버에 있어야 한다.
  // 실패해도 종료는 막지 않는다(오류 로깅은 인터셉터가 처리).
  const flushIncompleteLogs = async () => {
    const targets = logs.filter((log) => !log.completed && logHasRecord(log));
    const results = await Promise.allSettled(
      targets.map((log) => {
        const exercise = exerciseMap.get(log.exerciseId);
        return patchSessionLog.mutateAsync({
          sessionId,
          logId: log.id,
          ...buildLogPayload(log, isCardioExercise(exercise), isBodyweightExercise(exercise), true),
        });
      })
    );
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.warn("미완료 기록 저장 실패(종료는 계속 진행)", targets[index].id);
      }
    });
  };

  // 기록이 하나도 없는 채 종료 — COMPLETED를 보내지 않고 세션을 정리한다.
  // 예약 출신이고 날짜가 오늘/미래면 SCHEDULED로 되돌려 예약을 유지(로그 보존),
  // 즉흥 시작이거나 날짜가 지난 예약이면 삭제(하드 삭제)한다. 실패해도 종료 흐름은 막지 않는다.
  const discardEmptySession = async () => {
    // 메모리 값이 없으면(앱 재시작 등) 영속 저장된 값으로 복구한다. 둘 다 없으면 즉흥 시작으로
    // 간주해 DELETE — 예약이 아닌 세션을 SCHEDULED로 되돌리면 없던 예정 운동이 생기기 때문이다.
    const originId = scheduledOriginSessionId ?? (await loadScheduledOrigin());
    const fromSchedule = originId === sessionId;
    // 날짜 비교의 "오늘"은 한국(KST) 기준. 날짜를 못 읽었으면(드문 경우) 예약을 잃는 쪽이 더 나쁘므로 유지한다.
    const keepSchedule = fromSchedule && (!apiSession?.date || apiSession.date >= getTodayKstISODate());
    try {
      if (keepSchedule) {
        // 체크만 하고 기록이 0인 완료 로그는 먼저 해제 — 되돌린 예약을 다시 열 때 완료로 보이지 않게.
        // 해제 실패가 되돌리기를 막지는 않는다. date는 보내지 않는다(바뀌면 안 됨).
        const checked = logs.filter((log) => log.completed);
        await Promise.allSettled(
          checked.map((log) =>
            patchSessionLog.mutateAsync({ sessionId, logId: log.id, completed: false })
          )
        );
        await patchSession.mutateAsync({ sessionId, status: "SCHEDULED" });
      } else {
        // 상세 조회부터 끄고(404 방지) 캐시를 제거한 뒤 삭제한다. 목록 무효화는 훅이 처리한다.
        setSessionGone(true);
        queryClient.removeQueries({ queryKey: ["sessions", sessionId] });
        try {
          await deleteSession.mutateAsync(sessionId);
        } catch (error) {
          // 404는 이미 지워진 것이므로 성공으로 본다.
          if (!(isAxiosError(error) && error.response?.status === 404)) throw error;
        }
      }
    } catch {
      // 서버에 진행 중 세션이 남을 수 있다. 사용자는 요약 화면으로 계속 보낸다.
      console.warn("빈 운동 세션 정리 실패(종료는 계속 진행)", sessionId);
      appAlert("운동 기록을 정리하지 못했어요.");
    }
  };

  const handleFinish = async (perceivedDifficulty?: number) => {
    if (isRealSession && !logs.some(logHasRecord)) {
      await discardEmptySession();
    } else if (isRealSession) {
      // 모든 flush PATCH가 끝난 뒤에 status PATCH를 보낸다.
      await flushIncompleteLogs();
      try {
        const completed = await patchSession.mutateAsync({ sessionId, status: "COMPLETED", perceivedDifficulty });
        setXpResult(completed.xp ?? null);
      } catch {
        appAlert("운동 종료 처리에 실패했어요. 다시 시도해주세요.");
        return;
      }
    }
    // 세트 완료 없이 다른 운동으로 넘어간 것들 때문에 남아있을 수 있는 리마인드 알림을
    // 정리한다 — 운동을 종료했다는 건 더 이상 어떤 세트도 진행 중이 아니라는 뜻이라,
    // 실패해도 종료 자체를 막을 이유는 없어서 별도로 감싸 무시한다.
    cancelAllSetTimerReminders().catch(() => {});
    setToast(null);
    router.push("/workout/summary");
  };

  const handleConfirmDifficulty = () => {
    setShowDifficultyModal(false);
    handleFinish(selectedDifficulty ?? undefined);
  };

  const handleFinishPress = () => {
    if (allCompleted) {
      setShowDifficultyModal(true);
      return;
    }
    appAlert("완료하지 않은 세트가 있어요", "그래도 운동을 종료할까요?", [
      { text: "계속 할게요", style: "cancel" },
      {
        text: "종료",
        style: "destructive",
        // 기록이 하나도 없으면 운동강도 모달 없이 바로 종료(모달의 "건너뛰기"와 같은 경로).
        onPress: () => {
          if (logs.some(logHasRecord)) setShowDifficultyModal(true);
          else handleFinish();
        },
      },
    ]);
  };


  // 실제 완료 처리 — 서버 PATCH(실제 세션) 성공 후 로컬 완료. 성공 여부를 돌려준다.
  const doComplete = async (log: ExerciseLog): Promise<boolean> => {
    if (isRealSession) {
      const isCardio = isCardioExercise(exerciseMap.get(log.exerciseId));
      const isBodyweight = isBodyweightExercise(exerciseMap.get(log.exerciseId));
      try {
        await patchSessionLog.mutateAsync({
          sessionId,
          logId: log.id,
          completed: true,
          ...buildLogPayload(log, isCardio, isBodyweight),
        });
      } catch {
        appAlert("기록 저장에 실패했어요. 다시 시도해주세요.");
        return false;
      }
    }
    completeLog(log.id);
    return true;
  };

  // "완료로 표시" — 항상 즉시 완료한다(확인 알럿 없음). 미달 완료일 때만 "되돌리기" 토스트로 안내한다.
  const handleCompleteLog = async (log: ExerciseLog) => {
    const isCardio = isCardioExercise(exerciseMap.get(log.exerciseId));
    const reached = isLogTargetReached(log, isCardio);
    const ok = await doComplete(log);
    if (!ok) return;
    if (!reached) {
      showToast("완료로 표시했어요", "되돌리기", () => {
        setToast(null);
        void handleResumeLog(log);
      });
      return;
    }
    // 목표를 채우고 모두 완료된 경우는 토스트 없이 "운동 종료" 버튼 강조(allCompleted 효과)로 안내한다.
  };

  // 완료 취소(이어서 하기) — 실제 세션이면 서버에 completed:false만 보내 되돌리고(기록 필드는
  // 보내지 않아 서버 값 유지), 실패하면 로컬은 그대로 둔다.
  const handleResumeLog = async (log: ExerciseLog) => {
    if (isRealSession) {
      try {
        await patchSessionLog.mutateAsync({ sessionId, logId: log.id, completed: false });
      } catch (error) {
        appAlert(getKoreanApiErrorMessage(error) ?? "완료 취소에 실패했어요. 다시 시도해주세요.");
        return;
      }
    }
    uncompleteLog(log.id);
  };

  // 운동 중에도 목표 세트 수를 조정할 수 있게 — PATCH updateItems로 서버에 반영하고
  // 성공하면 로컬에도 같은 값을 반영한다(완료된/진행 중인 세트 기록은 유지됨).
  const handleAdjustTargetSets = async (log: ExerciseLog, delta: number) => {
    const nextTargetSets = Math.max(1, log.targetSets + delta);
    if (nextTargetSets === log.targetSets) return;
    if (isRealSession) {
      try {
        await patchSession.mutateAsync({
          sessionId,
          updateItems: [
            {
              logId: log.id,
              exerciseId: log.exerciseId,
              sortOrder: log.sortOrder,
              targetSets: nextTargetSets,
              targetReps: log.targetReps,
              targetWeight: log.targetWeight,
            },
          ],
        });
      } catch {
        appAlert("목표 세트 수 변경에 실패했어요. 다시 시도해주세요.");
        return;
      }
    }
    setTargetSets(log.id, nextTargetSets);
  };

  if (sessionId !== storedSessionId) {
    return null;
  }

  const activeLog = logs.find((log) => log.id === expandedId) ?? logs.find((log) => !log.completed) ?? logs[0];
  // 목록 표시 순서만 진행중 > 대기 > 완료로 정렬 — 완료된 운동은 맨 아래로 밀려난다.
  // (정렬은 sort()가 안정 정렬이라 같은 우선순위 안에서는 원래 순서 유지)
  const sortedLogs = [...logs].sort((a, b) => logListPriority(a) - logListPriority(b));

  return (
    // 이 화면은 presentation:"modal"로 뜨는 네이티브 모달 화면이다. app/_layout.tsx에 한 번만
    // 마운트된 전역 AppAlertModal은 Stack의 형제로 렌더되는데, 이 화면처럼 네이티브 모달로
    // 띄운 화면 위에서는 그 오버레이가 화면 뒤로 깔려 버튼이 안 눌리는 문제가 있었다
    // (완료 저장 실패 alert가 이 화면 뒤에 깔리는 버그로 발견) — 이 화면 안에도 하나 더
    // 마운트해서 같은 네이티브 레이어(이 화면 자신) 위에서 뜨게 한다.
    <>
      <KeyboardDismissView>
      <SafeAreaView
        style={styles.container}
        onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
      >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>운동 진행 중</Text>
          {(apiSession?.title ?? fallbackTemplate?.name) && (
            <Text style={styles.subtitle}>{apiSession?.title ?? fallbackTemplate?.name}</Text>
          )}
        </View>
        <Pressable onPress={handleClose}>
          <Text style={styles.closeButtonText}>닫기</Text>
        </Pressable>
      </View>

      {activeLog && (
        <ActiveExercisePanel
          key={activeLog.id}
          log={activeLog}
          isCardio={isCardioExercise(exerciseMap.get(activeLog.exerciseId))}
          isBodyweight={isBodyweightExercise(exerciseMap.get(activeLog.exerciseId))}
          onChangeField={(field, value) => updateField(activeLog.id, field, value)}
          onAdjustSets={(delta) => adjustActualSets(activeLog.id, delta)}
          onAdjustTargetSets={(delta) => handleAdjustTargetSets(activeLog, delta)}
          onRecordSetTiming={(timing) => recordSetTiming(activeLog.id, timing)}
          onComplete={() => handleCompleteLog(activeLog)}
          onResume={() => handleResumeLog(activeLog)}
        />
      )}

      <ScrollView contentContainerStyle={styles.listContent} automaticallyAdjustKeyboardInsets {...keyboardScrollProps}>
        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionTitle}>운동 목록</Text>
          {isRealSession && (
            <Pressable
              style={styles.addExerciseButton}
              onPress={handleAddExercisePress}
              hitSlop={6}
            >
              <CirclePlus size={16} color="#2DD4BF" />
              <Text style={styles.addExerciseButtonText}>운동 추가</Text>
            </Pressable>
          )}
        </View>
        {sortedLogs.map((log) => {
          const active = log.id === activeLog?.id;
          const isCardio = isCardioExercise(exerciseMap.get(log.exerciseId));
          const statusText = isCardio
            ? log.completed
              ? `${formatSeconds(Number(log.actualDurationSeconds) || 0)} 완료`
              : formatSeconds(log.targetDurationSeconds)
            : log.completed
              ? `${log.actualSets || 0}세트 완료`
              : `${log.actualSets || 0}/${log.targetSets} 세트`;
          return (
            <Pressable
              key={log.id}
              style={[styles.listItem, active && styles.listItemActive]}
              onPress={() => setExpandedId(log.id)}
            >
              <Text style={[styles.listItemName, active && styles.listItemNameActive]}>{log.name}</Text>
              <Text style={[styles.listItemStatus, log.completed && styles.listItemStatusDone]}>{statusText}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 모든 운동이 완료되기 전엔 톤 다운(색만 바꾸고 크기/위치는 고정) — 눌러서 일찍 종료하는 건 계속 가능 */}
      <Animated.View
        style={{ transform: [{ scale: finishPulse }] }}
        onLayout={(e) => setFinishTop(e.nativeEvent.layout.y)}
      >
        <Pressable
          style={[styles.finishButton, !allCompleted && styles.finishButtonToneDown]}
          onPress={handleFinishPress}
        >
          <Text style={[styles.finishButtonText, !allCompleted && styles.buttonTextToneDown]}>운동 종료</Text>
        </Pressable>
      </Animated.View>

      {/* 토스트는 측정된 "운동 종료" 버튼 top 바로 위(간격 16)에 둔다. 같은 컨테이너 좌표계라 safe area가 자동 반영된다.
          측정 전에는 그리지 않는다(레이아웃 직후 한 프레임 안에 측정됨). */}
      {finishTop !== null && containerHeight !== null && (
        <AppToast
          toast={toast}
          onDismiss={() => setToast(null)}
          bottom={containerHeight - finishTop + TOAST_GAP}
        />
      )}

      <Modal
        visible={showDifficultyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDifficultyModal(false)}
      >
        <View style={styles.difficultyOverlay}>
          <View style={styles.difficultyCard}>
            <Text style={styles.difficultyTitle}>오늘 운동 강도가 어땠나요?</Text>
            <Text style={styles.difficultySubtitle}>1(아주 쉬움) ~ 10(최대 강도)</Text>
            <View style={styles.difficultyGrid}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <Pressable
                  key={n}
                  style={[styles.difficultyChip, selectedDifficulty === n && styles.difficultyChipActive]}
                  onPress={() => setSelectedDifficulty(n)}
                >
                  <Text
                    style={[
                      styles.difficultyChipText,
                      selectedDifficulty === n && styles.difficultyChipTextActive,
                    ]}
                  >
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.difficultyConfirmButton, !selectedDifficulty && styles.difficultyConfirmButtonDisabled]}
              onPress={handleConfirmDifficulty}
              disabled={!selectedDifficulty}
            >
              <Text style={styles.difficultyConfirmButtonText}>완료</Text>
            </Pressable>
            <Pressable onPress={() => { setShowDifficultyModal(false); handleFinish(); }}>
              <Text style={styles.difficultySkipText}>건너뛰기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
      </KeyboardDismissView>
      <AppAlertModal />
    </>
  );
}

type ActiveExercisePanelProps = {
  log: ExerciseLog;
  isCardio: boolean;
  isBodyweight: boolean;
  onChangeField: (field: ActualField, value: string) => void;
  onAdjustSets: (delta: number) => void;
  onAdjustTargetSets: (delta: number) => void;
  onRecordSetTiming: (timing: SetTiming) => void;
  onComplete: () => void;
  onResume: () => void;
};

// 화면 상단에 고정된, 지금 진행 중인 운동 하나만 보여주는 패널.
// 목록의 다른 운동을 탭하면 이 패널의 대상이 바뀐다(각 운동마다 개별 타이머를 두지 않음).
function ActiveExercisePanel({
  log,
  isCardio,
  isBodyweight,
  onChangeField,
  onAdjustSets,
  onAdjustTargetSets,
  onRecordSetTiming,
  onComplete,
  onResume,
}: ActiveExercisePanelProps) {
  // 이 종목의 목표를 다 채우기 전엔 "완료로 표시"를 톤 다운(비활성화는 아님 — 일찍 끝낼 수 있어야 함)
  const targetReached = isLogTargetReached(log, isCardio);
  return (
    <View style={styles.activeCard}>
      <Text style={styles.activeName}>{log.name}</Text>

      {log.completed ? (
        <>
          <View style={styles.doneWrap}>
            <CircleCheck size={20} color="#2DD4BF" />
            <Text style={styles.doneText}>
              {isCardio
                ? `완료된 운동이에요 · ${formatSeconds(Number(log.actualDurationSeconds) || 0)}`
                : `완료된 운동이에요 · ${log.actualSets || 0}세트`}
            </Text>
          </View>
          {!isCardio && <SetTimingHistory setTimings={log.setTimings} />}
          <Pressable style={styles.resumeButton} onPress={onResume}>
            <Text style={styles.resumeButtonText}>이어서 하기</Text>
          </Pressable>
        </>
      ) : isCardio ? (
        <>
          <DurationTimer
            targetDurationSeconds={log.targetDurationSeconds}
            actualDurationSeconds={Number(log.actualDurationSeconds) || 0}
            onChangeDuration={(seconds) => onChangeField("actualDurationSeconds", String(seconds))}
          />

          <Pressable
            style={[styles.completeButton, !targetReached && styles.completeButtonToneDown]}
            onPress={onComplete}
          >
            <Text style={[styles.completeButtonText, !targetReached && styles.buttonTextToneDown]}>
              완료로 표시
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <SetTimer setTimings={log.setTimings} targetSets={log.targetSets} onRecordSetTiming={onRecordSetTiming} />

          <View style={styles.targetSetsRow}>
            <Text style={styles.targetSetsLabel}>목표 세트 수</Text>
            <View style={styles.statStepperRow}>
              <Pressable onPress={() => onAdjustTargetSets(-1)} hitSlop={6}>
                <CircleMinus size={16} color="#6B6B6B" />
              </Pressable>
              <Text style={styles.targetSetsValue}>{log.targetSets}</Text>
              <Pressable onPress={() => onAdjustTargetSets(1)} hitSlop={6}>
                <CirclePlus size={16} color="#2DD4BF" />
              </Pressable>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>세트</Text>
              <View style={styles.statStepperRow}>
                <Pressable onPress={() => onAdjustSets(-1)} hitSlop={6}>
                  <CircleMinus size={18} color="#6B6B6B" />
                </Pressable>
                <Text style={styles.statValue}>
                  {log.actualSets || 0}/{log.targetSets}
                </Text>
                <Pressable onPress={() => onAdjustSets(1)} hitSlop={6}>
                  <CirclePlus size={18} color="#2DD4BF" />
                </Pressable>
              </View>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>반복</Text>
              <AppTextInput
                style={styles.statValueInput}
                value={log.actualReps}
                onChangeText={(value) => onChangeField("actualReps", value)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#6B6B6B"
              />
            </View>
            {!isBodyweight && (
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>무게(kg)</Text>
                <AppTextInput
                  style={styles.statValueInput}
                  value={log.actualWeight}
                  onChangeText={(value) => onChangeField("actualWeight", sanitizeWeightInput(value))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#6B6B6B"
                />
              </View>
            )}
          </View>

          <Pressable
            style={[styles.completeButton, !targetReached && styles.completeButtonToneDown]}
            onPress={onComplete}
          >
            <Text style={[styles.completeButtonText, !targetReached && styles.buttonTextToneDown]}>
              완료로 표시
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

type SetTimerProps = {
  setTimings: SetTiming[];
  targetSets: number;
  onRecordSetTiming: (timing: SetTiming) => void;
};

// 세트별 스톱워치. pause 없음 — "세트 시작" → "세트 완료" 한 번씩만 눌러
// 세트 하나의 시작/종료 시각을 기록한다(휴식시간은 추적하지 않음).
// 목표 세트 수를 넘겨도 계속 기록할 수 있게 두되(추가 세트를 실제로 더 하는 경우 대비),
// 목표 초과 여부만 라벨로 구분해서 보여준다.
function SetTimer({ setTimings, targetSets, onRecordSetTiming }: SetTimerProps) {
  const [running, setRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startedAtRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // "세트 완료"를 깜빡하고 폰을 놓아버린 경우를 잡기 위한 리마인드 알림 id.
  // 다른 운동으로 전환/화면 이탈해도(컴포넌트 unmount) 일부러 취소하지 않는다 —
  // 오히려 그게 "깜빡했을" 상황이라 알림이 그대로 울려야 의미가 있다.
  const reminderIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const currentSetIndex = setTimings.length;
  const isOverTarget = targetSets > 0 && currentSetIndex + 1 > targetSets;

  const handleStart = () => {
    const now = new Date();
    startedAtRef.current = now.toISOString();
    setElapsedSeconds(0);
    setRunning(true);
    // 잠금화면 등으로 백그라운드에 가면 setInterval이 지연/스킵될 수 있어서,
    // 카운터를 그냥 +1 하면 실제 경과 시간과 어긋난다(예: 화면 표시 00:05, 실제 45초).
    // 매 tick마다 startedAt 기준 실제 경과 시간을 다시 계산해 값을 맞춘다.
    intervalRef.current = setInterval(() => {
      const startedAt = startedAtRef.current;
      if (!startedAt) return;
      setElapsedSeconds(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    }, 1000);
    scheduleSetTimerReminder()
      .then((id) => {
        reminderIdRef.current = id;
      })
      .catch(() => {});
  };

  const handleStop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    if (startedAtRef.current) {
      onRecordSetTiming({
        setIndex: currentSetIndex,
        startedAt: startedAtRef.current,
        endedAt: new Date().toISOString(),
      });
    }
    startedAtRef.current = null;
    setElapsedSeconds(0);
    if (reminderIdRef.current) {
      cancelSetTimerReminder(reminderIdRef.current).catch(() => {});
      reminderIdRef.current = null;
    }
  };

  return (
    <View style={styles.timerWrap}>
      <Text style={styles.timerCaption}>
        경과 시간 · 세트 {currentSetIndex + 1}
        {isOverTarget ? " (목표 초과)" : ""}
      </Text>
      <Text style={[styles.timerClock, isOverTarget && styles.timerClockOverTarget]}>
        {formatSeconds(elapsedSeconds)}
      </Text>
      <Pressable
        style={[styles.timerButton, running && styles.timerButtonActive]}
        onPress={running ? handleStop : handleStart}
      >
        <Text style={styles.timerButtonText}>{running ? "세트 완료" : "세트 시작"}</Text>
      </Pressable>
      <SetTimingHistory setTimings={setTimings} />
    </View>
  );
}

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type DurationTimerProps = {
  targetDurationSeconds: number;
  actualDurationSeconds: number;
  onChangeDuration: (totalSeconds: number) => void;
};

// 유산소용 단일 누적 스톱워치 — 세트 개념이 없어서 시작/정지를 여러 번 오갈 수 있고,
// 정지할 때마다 누적 시간을 onChangeDuration으로 알린다(일시정지 후 이어서 측정 가능).
function DurationTimer({ targetDurationSeconds, actualDurationSeconds, onChangeDuration }: DurationTimerProps) {
  const [running, setRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(actualDurationSeconds);
  const baseSecondsRef = useRef(actualDurationSeconds);
  const startedAtRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleStart = () => {
    startedAtRef.current = new Date().toISOString();
    setRunning(true);
    intervalRef.current = setInterval(() => {
      const startedAt = startedAtRef.current;
      if (!startedAt) return;
      const delta = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      setElapsedSeconds(baseSecondsRef.current + delta);
    }, 1000);
  };

  const handleStop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    const startedAt = startedAtRef.current;
    if (startedAt) {
      const delta = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      const total = baseSecondsRef.current + delta;
      baseSecondsRef.current = total;
      setElapsedSeconds(total);
      onChangeDuration(total);
    }
    startedAtRef.current = null;
  };

  return (
    <View style={styles.timerWrap}>
      <Text style={styles.timerCaption}>
        경과 시간{targetDurationSeconds > 0 ? ` · 목표 ${formatSeconds(targetDurationSeconds)}` : ""}
      </Text>
      <Text style={styles.timerClock}>{formatSeconds(elapsedSeconds)}</Text>
      <Pressable
        style={[styles.timerButton, running && styles.timerButtonActive]}
        onPress={running ? handleStop : handleStart}
      >
        <Text style={styles.timerButtonText}>
          {running ? "일시정지" : elapsedSeconds > 0 ? "이어서 측정" : "측정 시작"}
        </Text>
      </Pressable>
    </View>
  );
}

// 운동이 완료된 뒤에도(진행 중 패널을 다시 열었을 때) 세트별 소요 시간을 계속 볼 수 있게
// SetTimer와 완료 화면 양쪽에서 공용으로 쓰는 이력 표시.
function SetTimingHistory({ setTimings }: { setTimings: SetTiming[] }) {
  if (setTimings.length === 0) return null;
  return (
    <View style={styles.timerHistory}>
      {setTimings.map((timing) => {
        const seconds = Math.round(
          (new Date(timing.endedAt).getTime() - new Date(timing.startedAt).getTime()) / 1000
        );
        return (
          <Text key={timing.setIndex} style={styles.timerHistoryText}>
            세트 {timing.setIndex + 1}: {formatSeconds(Math.max(0, seconds))}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    color: "#A0A0A0",
    fontSize: 14,
    marginTop: 4,
  },
  closeButtonText: {
    color: "#A0A0A0",
    fontSize: 15,
    fontWeight: "600",
  },
  activeCard: {
    marginHorizontal: 24,
    marginTop: 16,
    backgroundColor: "#16161C",
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  activeName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  doneWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  doneText: {
    color: "#2DD4BF",
    fontSize: 14,
    fontWeight: "600",
  },
  timerWrap: {
    backgroundColor: "#0B0B0F",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 10,
  },
  timerCaption: {
    color: "#A0A0A0",
    fontSize: 12,
    fontWeight: "600",
  },
  timerClock: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  timerClockOverTarget: {
    color: "#F87171",
  },
  timerButton: {
    backgroundColor: "#2DD4BF",
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 4,
  },
  timerButtonActive: {
    backgroundColor: "#F87171",
  },
  timerButtonText: {
    color: "#0B0B0F",
    fontSize: 14,
    fontWeight: "700",
  },
  timerHistory: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 2,
  },
  timerHistoryText: {
    color: "#6B6B6B",
    fontSize: 12,
  },
  targetSetsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  targetSetsLabel: {
    color: "#A0A0A0",
    fontSize: 12,
  },
  targetSetsValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
  },
  statTile: {
    flex: 1,
    backgroundColor: "#0B0B0F",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 6,
  },
  statLabel: {
    color: "#A0A0A0",
    fontSize: 11,
  },
  statStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    color: "#2DD4BF",
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  statValueInput: {
    color: "#2DD4BF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    minWidth: 40,
    padding: 0,
  },
  completeButton: {
    backgroundColor: "#2DD4BF",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  completeButtonText: {
    color: "#0B0B0F",
    fontSize: 15,
    fontWeight: "600",
  },
  // 완료 취소 보조 버튼 — "완료로 표시"보다 약한 아웃라인 스타일
  resumeButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.4)",
  },
  resumeButtonText: {
    color: "#2DD4BF",
    fontSize: 15,
    fontWeight: "600",
  },
  completeButtonToneDown: {
    backgroundColor: "rgba(45, 212, 191, 0.16)",
  },
  // 톤 다운 버튼 글자 — 원래 어두운 글자색 대신 민트색을 써서 흐린 배경 위에서도 읽히게 한다.
  buttonTextToneDown: {
    color: "#2DD4BF",
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 10,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addExerciseButtonText: {
    color: "#2DD4BF",
    fontSize: 13,
    fontWeight: "600",
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#16161C",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  listItemActive: {
    borderWidth: 1,
    borderColor: "#2DD4BF",
  },
  listItemName: {
    color: "#A0A0A0",
    fontSize: 14,
    fontWeight: "600",
  },
  listItemNameActive: {
    color: "#2DD4BF",
  },
  listItemStatus: {
    color: "#6B6B6B",
    fontSize: 13,
  },
  listItemStatusDone: {
    color: "#6B6B6B",
  },
  finishButton: {
    backgroundColor: "#2DD4BF",
    paddingVertical: 14,
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  finishButtonToneDown: {
    backgroundColor: "rgba(45, 212, 191, 0.16)",
  },
  finishButtonText: {
    color: "#0B0B0F",
    fontSize: 16,
    fontWeight: "600",
  },
  difficultyOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  difficultyCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#16161C",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 4,
  },
  difficultyTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  difficultySubtitle: {
    color: "#A0A0A0",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
  },
  difficultyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  difficultyChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0B0B0F",
    alignItems: "center",
    justifyContent: "center",
  },
  difficultyChipActive: {
    backgroundColor: "#2DD4BF",
  },
  difficultyChipText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  difficultyChipTextActive: {
    color: "#0B0B0F",
  },
  difficultyConfirmButton: {
    width: "100%",
    backgroundColor: "#2DD4BF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  difficultyConfirmButtonDisabled: {
    backgroundColor: "rgba(45, 212, 191, 0.3)",
  },
  difficultyConfirmButtonText: {
    color: "#0B0B0F",
    fontSize: 15,
    fontWeight: "700",
  },
  difficultySkipText: {
    color: "#6B6B6B",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 14,
  },
});
