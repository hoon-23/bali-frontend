import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getExerciseById } from "../../constants/exercises";
import { appAlert } from "../../lib/alert";
import { ApiExercise, formatExerciseName, useExerciseMap } from "../../hooks/api/useExercises";
import { ApiSessionDetail, useSession, usePatchSession, usePatchSessionLog } from "../../hooks/api/useSessions";
import { useTemplatesStore } from "../../store/templatesStore";
import {
  ActualField,
  ExerciseLog,
  SetTiming,
  useWorkoutSessionStore,
} from "../../store/workoutSessionStore";

// templatesId 없이 운동이 시작되는 드문 경우를 위한 fallback
// (모든 "운동 시작" 진입점이 templateId를 넘기게 되면 발생하지 않아야 하지만,
// 혹시라도 그런 경우 화면이 빈 채로 렌더링되는 걸 방지함).
const FALLBACK_LOGS: ExerciseLog[] = [
  {
    id: "1",
    exerciseId: "e1",
    name: "벤치프레스",
    targetSets: 4,
    targetReps: 10,
    targetWeight: 60,
    actualSets: "",
    actualReps: "",
    actualWeight: "",
    completed: false,
    setTimings: [],
  },
];

function buildLogsFromTemplate(templateId: string | undefined): ExerciseLog[] {
  if (!templateId) return FALLBACK_LOGS;
  const template = useTemplatesStore.getState().getTemplate(templateId);
  if (!template) return FALLBACK_LOGS;

  return template.items.map((item) => ({
    id: item.id,
    exerciseId: item.exerciseId,
    name: getExerciseById(item.exerciseId)?.name ?? "알 수 없는 운동",
    targetSets: item.targetSets ?? 0,
    targetReps: item.targetReps ?? 0,
    targetWeight: item.targetWeight ?? 0,
    actualSets: "",
    actualReps: "",
    actualWeight: "",
    completed: false,
    setTimings: [],
  }));
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
        actualSets: log.actualSets != null ? String(log.actualSets) : "",
        actualReps: log.actualReps != null ? String(log.actualReps) : "",
        actualWeight: log.actualWeight != null ? String(log.actualWeight) : "",
        completed: log.completed,
        setTimings: log.setTimings ?? [],
      };
    });
}

export default function WorkoutSessionScreen() {
  const { sessionId, templateId } = useLocalSearchParams<{
    sessionId: string;
    templateId?: string;
  }>();
  const router = useRouter();

  const { data: apiSession, isError: sessionFetchFailed } = useSession(sessionId);
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
  const recordSetTiming = useWorkoutSessionStore((state) => state.recordSetTiming);
  const completeLog = useWorkoutSessionStore((state) => state.completeLog);

  useEffect(() => {
    if (sessionId === useWorkoutSessionStore.getState().sessionId) return;
    // 실제 세션 조회가 성공하면 그 데이터로, 실패(404 등 — 삭제된 세션이나
    // 개발 중 남은 잘못된 링크)하면 로컬 mock 템플릿 조립 로직으로 폴백한다.
    if (apiSession) {
      startSession(sessionId, buildLogsFromApiSession(apiSession, exerciseMap), true);
      return;
    }
    if (sessionFetchFailed) {
      startSession(sessionId, buildLogsFromTemplate(templateId), false);
    }
    // apiSession/sessionFetchFailed 둘 다 아직이면(조회 중) 대기 — 다음 렌더에서 재평가됨.
  }, [sessionId, templateId, apiSession, sessionFetchFailed, exerciseMap, startSession]);

  const handleClose = () => {
    router.back();
  };

  const handleFinish = async () => {
    if (isRealSession) {
      try {
        await patchSession.mutateAsync({ sessionId, status: "COMPLETED" });
      } catch {
        appAlert("운동 종료 처리에 실패했어요. 다시 시도해주세요.");
        return;
      }
    }
    router.push("/workout/summary");
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>운동 진행 중</Text>
            <Text style={styles.subtitle}>세션 ID: {sessionId}</Text>
          </View>
          <Pressable onPress={handleClose}>
            <Text style={styles.closeButtonText}>닫기</Text>
          </Pressable>
        </View>

        {logs.map((log) => (
          <ExerciseCard
            key={log.id}
            log={log}
            expanded={expandedId === log.id}
            showTimer={isRealSession}
            onToggleExpand={() => setExpandedId(log.id)}
            onChangeField={(field, value) => updateField(log.id, field, value)}
            onRecordSetTiming={(timing) => recordSetTiming(log.id, timing)}
            onComplete={() => handleCompleteLog(log)}
          />
        ))}
      </ScrollView>

      <Pressable style={styles.finishButton} onPress={handleFinish}>
        <Text style={styles.finishButtonText}>운동 종료</Text>
      </Pressable>
    </SafeAreaView>
  );
}

type ExerciseCardProps = {
  log: ExerciseLog;
  expanded: boolean;
  showTimer: boolean;
  onToggleExpand: () => void;
  onChangeField: (field: ActualField, value: string) => void;
  onRecordSetTiming: (timing: SetTiming) => void;
  onComplete: () => void;
};

function ExerciseCard({
  log,
  expanded,
  showTimer,
  onToggleExpand,
  onChangeField,
  onRecordSetTiming,
  onComplete,
}: ExerciseCardProps) {
  const status = log.completed ? "완료" : expanded ? "진행중" : "대기";

  return (
    <View style={styles.card}>
      <Pressable onPress={onToggleExpand}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{log.name}</Text>
          <Text
            style={[
              styles.cardBadge,
              !log.completed && expanded && styles.cardBadgeActive,
              log.completed && styles.cardBadgeDone,
            ]}
          >
            {status}
          </Text>
        </View>
        <Text style={styles.cardTarget}>
          목표 {log.targetSets}세트 × {log.targetReps}회 × {log.targetWeight}kg
        </Text>
      </Pressable>

      {expanded && (
        <View style={styles.cardBody}>
          {showTimer && !log.completed && (
            <SetTimer
              setTimings={log.setTimings}
              targetSets={log.targetSets}
              onRecordSetTiming={onRecordSetTiming}
            />
          )}
          <View style={styles.inputRow}>
            <ExerciseInput
              label="세트"
              value={log.actualSets}
              onChangeText={(value) => onChangeField("actualSets", value)}
            />
            <ExerciseInput
              label="횟수"
              value={log.actualReps}
              onChangeText={(value) => onChangeField("actualReps", value)}
            />
            <ExerciseInput
              label="무게(kg)"
              value={log.actualWeight}
              onChangeText={(value) => onChangeField("actualWeight", value)}
            />
          </View>
          <Pressable style={styles.completeButton} onPress={onComplete}>
            <Text style={styles.completeButtonText}>완료로 표시</Text>
          </Pressable>
        </View>
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
      <View style={styles.timerRow}>
        <Text style={[styles.timerLabel, isOverTarget && styles.timerLabelOverTarget]}>
          세트 {currentSetIndex + 1}
          {isOverTarget ? " (목표 초과)" : ""}
        </Text>
        <Text style={styles.timerClock}>{formatSeconds(elapsedSeconds)}</Text>
        <Pressable
          style={[styles.timerButton, running && styles.timerButtonActive]}
          onPress={running ? handleStop : handleStart}
        >
          <Text style={styles.timerButtonText}>{running ? "세트 완료" : "세트 시작"}</Text>
        </Pressable>
      </View>
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

type ExerciseInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
};

function ExerciseInput({ label, value, onChangeText }: ExerciseInputProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor="#6B6B6B"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
  scrollContent: {
    padding: 24,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  card: {
    backgroundColor: "#16161C",
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cardBadge: {
    color: "#6B6B6B",
    fontSize: 12,
    fontWeight: "600",
  },
  cardBadgeActive: {
    color: "#FFFFFF",
  },
  cardBadgeDone: {
    color: "#2DD4BF",
  },
  cardTarget: {
    color: "#A0A0A0",
    fontSize: 13,
  },
  cardBody: {
    marginTop: 16,
    gap: 16,
  },
  timerWrap: {
    backgroundColor: "#0B0B0F",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timerLabel: {
    color: "#A0A0A0",
    fontSize: 13,
    fontWeight: "600",
  },
  timerLabelOverTarget: {
    color: "#F87171",
  },
  timerClock: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  timerButton: {
    backgroundColor: "#2DD4BF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  timerButtonActive: {
    backgroundColor: "#F87171",
  },
  timerButtonText: {
    color: "#0B0B0F",
    fontSize: 13,
    fontWeight: "700",
  },
  timerHistory: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timerHistoryText: {
    color: "#6B6B6B",
    fontSize: 12,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  inputGroup: {
    flex: 1,
    gap: 6,
  },
  inputLabel: {
    color: "#A0A0A0",
    fontSize: 12,
  },
  input: {
    backgroundColor: "#0B0B0F",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: "#FFFFFF",
    fontSize: 15,
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
  finishButton: {
    backgroundColor: "#2DD4BF",
    paddingVertical: 14,
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  finishButtonText: {
    color: "#0B0B0F",
    fontSize: 16,
    fontWeight: "600",
  },
});
