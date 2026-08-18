import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ExerciseLog = {
  id: string;
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  actualSets: string;
  actualReps: string;
  actualWeight: string;
  completed: boolean;
};

type ActualField = "actualSets" | "actualReps" | "actualWeight";

const INITIAL_LOGS: ExerciseLog[] = [
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
  {
    id: "2",
    name: "스쿼트",
    targetSets: 4,
    targetReps: 8,
    targetWeight: 80,
    actualSets: "",
    actualReps: "",
    actualWeight: "",
    completed: false,
  },
  {
    id: "3",
    name: "데드리프트",
    targetSets: 3,
    targetReps: 6,
    targetWeight: 100,
    actualSets: "",
    actualReps: "",
    actualWeight: "",
    completed: false,
  },
];

export default function WorkoutSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const [logs, setLogs] = useState<ExerciseLog[]>(INITIAL_LOGS);
  const [expandedId, setExpandedId] = useState<string | null>(
    INITIAL_LOGS.find((log) => !log.completed)?.id ?? null,
  );

  const handleFinish = () => {
    router.replace("/workout/summary");
  };

  const handleToggleExpand = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  const handleChangeField = (id: string, field: ActualField, value: string) => {
    setLogs((current) =>
      current.map((log) => (log.id === id ? { ...log, [field]: value } : log)),
    );
  };

  const handleComplete = (id: string) => {
    const updatedLogs = logs.map((log) =>
      log.id === id ? { ...log, completed: true } : log,
    );
    setLogs(updatedLogs);
    const completedIndex = updatedLogs.findIndex((log) => log.id === id);
    const nextIncomplete = updatedLogs
      .slice(completedIndex + 1)
      .find((log) => !log.completed);
    setExpandedId(nextIncomplete?.id ?? null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>운동 진행 중</Text>
        <Text style={styles.subtitle}>세션 ID: {sessionId}</Text>

        {logs.map((log) => (
          <ExerciseCard
            key={log.id}
            log={log}
            expanded={expandedId === log.id}
            onToggleExpand={() => handleToggleExpand(log.id)}
            onChangeField={(field, value) => handleChangeField(log.id, field, value)}
            onComplete={() => handleComplete(log.id)}
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
  return (
    <View style={styles.card}>
      <Pressable onPress={onToggleExpand}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{log.name}</Text>
          <Text style={[styles.cardBadge, log.completed && styles.cardBadgeDone]}>
            {log.completed ? "완료" : "진행중"}
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
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    color: "#A0A0A0",
    fontSize: 14,
    marginBottom: 8,
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
    color: "#A0A0A0",
    fontSize: 12,
    fontWeight: "600",
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
