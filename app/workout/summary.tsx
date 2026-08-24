import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useWorkoutSessionStore } from "../../store/workoutSessionStore";

export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const logs = useWorkoutSessionStore((state) => state.logs);
  const endSession = useWorkoutSessionStore((state) => state.endSession);

  const completedCount = logs.filter((log) => log.completed).length;

  const handleConfirm = () => {
    endSession();
    router.dismissTo("/home");
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>수고하셨어요!</Text>
        <Text style={styles.subtitle}>
          {logs.length}개 중 {completedCount}개 운동 완료
        </Text>

        <View style={styles.list}>
          {logs.map((log) => (
            <View key={log.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.exerciseName}>{log.name}</Text>
                <Text style={[styles.statusText, log.completed && styles.statusTextDone]}>
                  {log.completed ? "완료" : "미완료"}
                </Text>
              </View>
              <Text style={styles.detailLine}>
                목표 {log.targetSets}세트 × {log.targetReps}회 × {log.targetWeight}kg
              </Text>
              {log.completed && (
                <Text style={styles.detailLine}>
                  기록 {log.actualSets || 0}세트 × {log.actualReps || 0}회 × {log.actualWeight || 0}kg
                </Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <Pressable style={styles.button} onPress={handleConfirm}>
        <Text style={styles.buttonText}>확인</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  scrollContent: {
    alignItems: "center",
    gap: 16,
    paddingBottom: 24,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: "#A0A0A0",
    fontSize: 14,
  },
  list: {
    width: "100%",
    gap: 10,
  },
  card: {
    backgroundColor: "#1C1C25",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 14,
    gap: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  statusText: {
    color: "#6B6B6B",
    fontSize: 12,
    fontWeight: "600",
  },
  statusTextDone: {
    color: "#2DD4BF",
  },
  detailLine: {
    color: "#A0A0A0",
    fontSize: 13,
  },
  button: {
    backgroundColor: "#2DD4BF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#0B0B0F",
    fontSize: 16,
    fontWeight: "600",
  },
});
