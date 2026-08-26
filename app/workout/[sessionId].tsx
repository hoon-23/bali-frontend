import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { appAlert } from "../../lib/alert";
import { ApiExercise, formatExerciseName, useExerciseMap } from "../../hooks/api/useExercises";
import { ApiSessionDetail, useSession, usePatchSession, usePatchSessionLog } from "../../hooks/api/useSessions";
import { ApiTemplate, useTemplate } from "../../hooks/api/useTemplates";
import {
  ActualField,
  ExerciseLog,
  SetTiming,
  useWorkoutSessionStore,
} from "../../store/workoutSessionStore";

// 세션 조회가 실패했는데(삭제된 세션 등) templateId조차 없는 극히 드문 경우를 위한
// 최후의 fallback — 화면이 완전히 빈 채로 렌더링되는 것만 방지한다.
const FALLBACK_LOGS: ExerciseLog[] = [
  {
    id: "1",
    exerciseId: "e1",
    name: "벤치프레스",
    targetSets: 4,
    targetReps: 10,
    targetWeight: 60,
    actualSets: "0",
    actualReps: "10",
    actualWeight: "60",
    actualSetsTouched: false,
    completed: false,
    setTimings: [],
  },
];

function buildLogsFromApiTemplate(
  template: ApiTemplate,
  exerciseMap: Map<string, ApiExercise>
): ExerciseLog[] {
  return template.items.map((item) => {
    const exercise = exerciseMap.get(item.exerciseId);
    return {
      id: item.id,
      exerciseId: item.exerciseId,
      name: exercise ? formatExerciseName(exercise) : "알 수 없는 운동",
      targetSets: item.targetSets ?? 0,
      targetReps: item.targetReps ?? 0,
      targetWeight: item.targetWeight ?? 0,
      // 계획과 같으면 그대로 두고, 다르면 고쳐 쓰게 목표값으로 미리 채워둔다.
      actualSets: "0",
      actualReps: String(item.targetReps ?? 0),
      actualWeight: String(item.targetWeight ?? 0),
      actualSetsTouched: false,
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
        targetSets: log.targetSets ?? 0,
        targetReps: log.targetReps ?? 0,
        targetWeight: log.targetWeight ?? 0,
        actualSets: log.actualSets != null ? String(log.actualSets) : "0",
        actualReps: log.actualReps != null ? String(log.actualReps) : String(log.targetReps ?? 0),
        actualWeight: log.actualWeight != null ? String(log.actualWeight) : String(log.targetWeight ?? 0),
        // 서버에 이미 저장된 실제값이 있으면 사람이 입력한 값이니 자동집계로 덮어쓰지 않는다.
        actualSetsTouched: log.actualSets != null,
        completed: log.completed,
        setTimings: log.setTimings ?? [],
      };
    });
}

// 운동 목록 정렬 우선순위 — 진행중(세트 하나라도 기록됨) > 대기(아직 손 안 댐) > 완료.
function logListPriority(log: ExerciseLog): number {
  if (log.completed) return 2;
  if (log.setTimings.length > 0) return 0;
  return 1;
}

export default function WorkoutSessionScreen() {
  const { sessionId, templateId } = useLocalSearchParams<{
    sessionId: string;
    templateId?: string;
  }>();
  const router = useRouter();

  const { data: apiSession, isError: sessionFetchFailed } = useSession(sessionId);
  const { data: fallbackTemplate } = useTemplate(templateId);
  const exerciseMap = useExerciseMap();
  const patchSession = usePatchSession();
  const patchSessionLog = usePatchSessionLog();

  const storedSessionId = useWorkoutSessionStore((state) => state.sessionId);
  const isRealSession = useWorkoutSessionStore((state) => state.isRealSession);
  const logs = useWorkoutSessionStore((state) => state.logs);
  const expandedId = useWorkoutSessionStore((state) => state.expandedId);
  const startSession = useWorkoutSessionStore((state) => state.startSession);
  const setExpandedId = useWorkoutSessionStore((state) => state.setExpandedId);
  const updateField = useWorkoutSessionStore((state) => state.updateField);
  const adjustActualSets = useWorkoutSessionStore((state) => state.adjustActualSets);
  const recordSetTiming = useWorkoutSessionStore((state) => state.recordSetTiming);
  const completeLog = useWorkoutSessionStore((state) => state.completeLog);

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

  const allCompleted = logs.length > 0 && logs.every((log) => log.completed);
  const allCompletedAlertShownRef = useRef(false);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);

  useEffect(() => {
    if (allCompleted && !allCompletedAlertShownRef.current) {
      appAlert("모든 운동을 완료했어요!", "운동을 종료할까요?", [
        { text: "계속 볼게요", style: "cancel" },
        { text: "운동 종료", onPress: () => setShowDifficultyModal(true) },
      ]);
    }
    allCompletedAlertShownRef.current = allCompleted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCompleted]);

  const handleClose = () => {
    router.dismissTo("/home");
  };

  const handleFinish = async (perceivedDifficulty?: number) => {
    if (isRealSession) {
      try {
        await patchSession.mutateAsync({ sessionId, status: "COMPLETED", perceivedDifficulty });
      } catch {
        appAlert("운동 종료 처리에 실패했어요. 다시 시도해주세요.");
        return;
      }
    }
    router.push("/workout/summary");
  };

  const handleConfirmDifficulty = () => {
    setShowDifficultyModal(false);
    handleFinish(selectedDifficulty ?? undefined);
  };

  const handleCompleteLog = async (log: ExerciseLog) => {
    if (isRealSession) {
      try {
        await patchSessionLog.mutateAsync({
          sessionId,
          logId: log.id,
          completed: true,
          actualSets: log.actualSets ? Number(log.actualSets) : undefined,
          actualReps: log.actualReps ? Number(log.actualReps) : undefined,
          actualWeight: log.actualWeight ? Number(log.actualWeight) : undefined,
          setTimings: log.setTimings,
        });
      } catch {
        appAlert("기록 저장에 실패했어요. 다시 시도해주세요.");
        return;
      }
    }
    completeLog(log.id);
  };

  if (sessionId !== storedSessionId) {
    return null;
  }

  const activeLog = logs.find((log) => log.id === expandedId) ?? logs.find((log) => !log.completed) ?? logs[0];
  // 목록 표시 순서만 진행중 > 대기 > 완료로 정렬 — 완료된 운동은 맨 아래로 밀려난다.
  // (정렬은 sort()가 안정 정렬이라 같은 우선순위 안에서는 원래 순서 유지)
  const sortedLogs = [...logs].sort((a, b) => logListPriority(a) - logListPriority(b));

  return (
    <SafeAreaView style={styles.container}>
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
          onChangeField={(field, value) => updateField(activeLog.id, field, value)}
          onAdjustSets={(delta) => adjustActualSets(activeLog.id, delta)}
          onRecordSetTiming={(timing) => recordSetTiming(activeLog.id, timing)}
          onComplete={() => handleCompleteLog(activeLog)}
        />
      )}

      <ScrollView contentContainerStyle={styles.listContent}>
        <Text style={styles.sectionTitle}>운동 목록</Text>
        {sortedLogs.map((log) => {
          const active = log.id === activeLog?.id;
          return (
            <Pressable
              key={log.id}
              style={[styles.listItem, active && styles.listItemActive]}
              onPress={() => setExpandedId(log.id)}
            >
              <Text style={[styles.listItemName, active && styles.listItemNameActive]}>{log.name}</Text>
              <Text style={[styles.listItemStatus, log.completed && styles.listItemStatusDone]}>
                {log.completed ? "완료" : `${log.actualSets || 0}/${log.targetSets} 세트`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        style={[styles.finishButton, !allCompleted && styles.finishButtonDisabled]}
        onPress={() => setShowDifficultyModal(true)}
        disabled={!allCompleted}
      >
        <Text style={styles.finishButtonText}>운동 종료</Text>
      </Pressable>

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
  );
}

type ActiveExercisePanelProps = {
  log: ExerciseLog;
  onChangeField: (field: ActualField, value: string) => void;
  onAdjustSets: (delta: number) => void;
  onRecordSetTiming: (timing: SetTiming) => void;
  onComplete: () => void;
};

// 화면 상단에 고정된, 지금 진행 중인 운동 하나만 보여주는 패널.
// 목록의 다른 운동을 탭하면 이 패널의 대상이 바뀐다(각 운동마다 개별 타이머를 두지 않음).
function ActiveExercisePanel({
  log,
  onChangeField,
  onAdjustSets,
  onRecordSetTiming,
  onComplete,
}: ActiveExercisePanelProps) {
  return (
    <View style={styles.activeCard}>
      <Text style={styles.activeName}>{log.name}</Text>

      {log.completed ? (
        <View style={styles.doneWrap}>
          <Ionicons name="checkmark-circle" size={20} color="#2DD4BF" />
          <Text style={styles.doneText}>완료된 운동이에요</Text>
        </View>
      ) : (
        <>
          <SetTimer setTimings={log.setTimings} targetSets={log.targetSets} onRecordSetTiming={onRecordSetTiming} />

          <View style={styles.statRow}>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>세트</Text>
              <View style={styles.statStepperRow}>
                <Pressable onPress={() => onAdjustSets(-1)} hitSlop={6}>
                  <Ionicons name="remove-circle-outline" size={18} color="#6B6B6B" />
                </Pressable>
                <Text style={styles.statValue}>
                  {log.actualSets || 0}/{log.targetSets}
                </Text>
                <Pressable onPress={() => onAdjustSets(1)} hitSlop={6}>
                  <Ionicons name="add-circle-outline" size={18} color="#2DD4BF" />
                </Pressable>
              </View>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>반복</Text>
              <TextInput
                style={styles.statValueInput}
                value={log.actualReps}
                onChangeText={(value) => onChangeField("actualReps", value)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#6B6B6B"
              />
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>무게(kg)</Text>
              <TextInput
                style={styles.statValueInput}
                value={log.actualWeight}
                onChangeText={(value) => onChangeField("actualWeight", value)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#6B6B6B"
              />
            </View>
          </View>

          <Pressable style={styles.completeButton} onPress={onComplete}>
            <Text style={styles.completeButtonText}>완료로 표시</Text>
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
    intervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
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
  };

  const formatSeconds = (total: number) => {
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
      {setTimings.length > 0 && (
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
      )}
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
  finishButtonDisabled: {
    backgroundColor: "rgba(45, 212, 191, 0.3)",
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
