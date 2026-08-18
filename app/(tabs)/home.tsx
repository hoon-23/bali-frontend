import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useWorkoutSessionStore } from "../../store/workoutSessionStore";

export default function HomeScreen() {
  const router = useRouter();
  const activeSessionId = useWorkoutSessionStore((state) => state.sessionId);

  const handleStartWorkout = () => {
    if (activeSessionId) {
      Alert.alert(
        "진행 중인 운동이 있습니다",
        "새로 시작하면 기존 기록이 사라집니다.",
        [
          { text: "취소", style: "cancel" },
          {
            text: "새로 시작",
            style: "destructive",
            onPress: () => router.push(`/workout/${Date.now()}`),
          },
        ],
      );
      return;
    }
    router.push(`/workout/${Date.now()}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>홈 화면 (준비 중)</Text>
      <Pressable style={styles.button} onPress={handleStartWorkout}>
        <Text style={styles.buttonText}>운동 시작</Text>
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
  },
  text: {
    color: "#FFFFFF",
    fontSize: 18,
  },
  button: {
    backgroundColor: "#2DD4BF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    color: "#0B0B0F",
    fontSize: 16,
    fontWeight: "600",
  },
});
