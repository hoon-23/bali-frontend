import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
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
import { useTemplatesStore } from "../../store/templatesStore";
import {
  ActualField,
  ExerciseLog,
  useWorkoutSessionStore,
} from "../../store/workoutSessionStore";

// templateId 없이 운동이 시작되는 드문 경우를 위한 fallback
// (모든 "운동 시작" 진입점이 templateId를 넘기게 되면 발생하지 않아야 하지만,
// 혹시라도 그런 경우 화면이 빈 채로 렌더링되는 걸 방지함).
const FALLBACK_LOGS: ExerciseLog[] = [
  {
    id: "1",
    name: "벤치프레스",
    targetSets: 4,
    targetReps: 10,
    targetWeight: 60,
    actualSets: "",
    actualReps: "",
    actualWeight: "",
    completed: false,
  },
];

function buildLogsFromTemplate(templateId: string | undefined): ExerciseLog[] {
  if (!templateId) return FALLBACK_LOGS;
  const template = useTemplatesStore.getState().getTemplate(templateId);
  if (!template) return FALLBACK_LOGS;

  return template.items.map((item) => ({
    id: item.id,
    name: getExerciseById(item.exerciseId)?.name ?? "알 수 없는 운동",
    targetSets: item.targetSets ?? 0,
    targetReps: item.targetReps ?? 0,
    targetWeight: item.targetWeight ?? 0,
    actualSets: "",
    actualReps: "",
    actualWeight: "",
    completed: false,
  }));
}

export default function WorkoutSessionScreen() {
  const { sessionId, templateId } = useLocalSearchParams<{
    sessionId: string;
    templateId?: string;
  }>();
  const router = useRouter();

  const storedSessionId = useWorkoutSessionStore((state) => state.sessionId);
  const logs = useWorkoutSessionStore((state) => state.logs);
  const expandedId = useWorkoutSessionStore((state) => state.expandedId);
  const startSession = useWorkoutSessionStore((state) => state.startSession);
  const setExpandedId = useWorkoutSessionStore((state) => state.setExpandedId);
  const updateField = useWorkoutSessionStore((state) => state.updateField);
  const completeLog = useWorkoutSessionStore((state) => state.completeLog);

  useEffect(() => {
    if (sessionId !== useWorkoutSessionStore.getState().sessionId) {
      startSession(sessionId, buildLogsFromTemplate(templateId));
    }
    // URL 파라미터가 바뀔 때만(진짜로 다른 세션을 불러올 때만) 실행됨 — store가
    // 업데이트될 때마다 실행되면 안 됨. 그렇지 않으면 요약 화면에서 세션을
    // 종료해도(이 화면은 그 아래에 마운트된 채로 남아있음) 바로 다시 실행되면서
    // 방금 지운 세션을 재생성해버림.
  }, [sessionId, templateId, startSession]);

  const handleClose = () => {
    router.back();
  };

  const handleFinish = () => {
    router.push("/workout/summary");
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
            onToggleExpand={() => setExpandedId(log.id)}
            onChangeField={(field, value) => updateField(log.id, field, value)}
            onComplete={() => completeLog(log.id)}
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
  onToggleExpand: () => void;
  onChangeField: (field: ActualField, value: string) => void;
  onComplete: () => void;
};

function ExerciseCard({
  log,
  expanded,
  onToggleExpand,
  onChangeField,
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
