import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useWorkoutSessionStore } from "../../store/workoutSessionStore";

export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const endSession = useWorkoutSessionStore((state) => state.endSession);

  const handleConfirm = () => {
    endSession();
    router.replace("/home");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>수고하셨어요!</Text>
      <Text style={styles.subtitle}>운동 요약 (준비 중)</Text>
      <Pressable style={styles.button} onPress={handleConfirm}>
        <Text style={styles.buttonText}>확인</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0B0F",
    gap: 16,
    padding: 24,
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
  button: {
    backgroundColor: "#2DD4BF",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    color: "#0B0B0F",
    fontSize: 16,
    fontWeight: "600",
  },
});
