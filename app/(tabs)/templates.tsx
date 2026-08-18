import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function TemplatesScreen() {
  const router = useRouter();

  const handleStartWorkout = () => {
    router.push(`/workout/${Date.now()}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>템플릿 화면 (준비 중)</Text>
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
