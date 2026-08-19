import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../constants/layout";

const EXERCISE_NAME = "벤치 프레스";
const TARGET_SETS = 3;
const TARGET_REPS = 10;

type Effort = "쉬움" | "보통" | "어려움";
const EFFORT_OPTIONS: Effort[] = ["쉬움", "보통", "어려움"];

export default function SetEntryScreen() {
  const router = useRouter();
  const [weight, setWeight] = useState("20");
  const [reps, setReps] = useState("10");
  const [effort, setEffort] = useState<Effort>("보통");

  const handleComplete = () => {
    router.back();
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>세트 입력</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.content}>
          <Text style={styles.exerciseName}>{EXERCISE_NAME}</Text>
          <Text style={styles.exerciseTarget}>
            목표: {TARGET_SETS} × {TARGET_REPS}회
          </Text>

          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            placeholder="무게(kg)"
            placeholderTextColor="#6B6B6B"
          />
          <TextInput
            style={styles.input}
            value={reps}
            onChangeText={setReps}
            keyboardType="numeric"
            placeholder="횟수"
            placeholderTextColor="#6B6B6B"
          />

          <Text style={styles.effortLabel}>체감도</Text>
          <View style={styles.effortRow}>
            {EFFORT_OPTIONS.map((option) => {
              const selected = effort === option;
              return (
                <Pressable
                  key={option}
                  style={[styles.effortButton, selected && styles.effortButtonSelected]}
                  onPress={() => setEffort(option)}
                >
                  <Text
                    style={[styles.effortButtonText, selected && styles.effortButtonTextSelected]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.completeButton} onPress={handleComplete}>
            <Text style={styles.completeButtonText}>완료</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1C1C25",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    gap: 12,
  },
  exerciseName: {
    color: "#A0A0A0",
    fontSize: 14,
  },
  exerciseTarget: {
    color: "#2DD4BF",
    fontSize: 13,
    fontWeight: "600",
    marginTop: -8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1C1C25",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontSize: 16,
  },
  effortLabel: {
    color: "#A0A0A0",
    fontSize: 13,
    marginTop: 4,
  },
  effortRow: {
    flexDirection: "row",
    gap: 8,
  },
  effortButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#1C1C25",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  effortButtonSelected: {
    backgroundColor: "#2DD4BF",
    borderColor: "#2DD4BF",
  },
  effortButtonText: {
    color: "#A0A0A0",
    fontSize: 14,
    fontWeight: "600",
  },
  effortButtonTextSelected: {
    color: "#0B0B0F",
  },
  completeButton: {
    backgroundColor: "#2DD4BF",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },
  completeButtonText: {
    color: "#0B0B0F",
    fontSize: 16,
    fontWeight: "700",
  },
});
