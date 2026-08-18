import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function WorkoutSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();

  const handleFinish = () => {
    router.replace("/workout/summary");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>운동 진행 중</Text>
      <Text style={styles.subtitle}>세션 ID: {sessionId}</Text>
      <Pressable style={styles.button} onPress={handleFinish}>
        <Text style={styles.buttonText}>운동 종료</Text>
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
    fontSize: 20,
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
