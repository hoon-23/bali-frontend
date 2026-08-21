import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { appAlert } from "../../lib/alert";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { getExerciseById } from "../../constants/exercises";
import { MUSCLE_GROUP_IMAGES } from "../../constants/muscleGroups";
import { CARD_SHADOW } from "../../constants/shadow";
import type { TemplateItem } from "../../store/templatesStore";
import { useUpcomingWorkoutsStore } from "../../store/upcomingWorkoutsStore";
import { useWorkoutSessionStore } from "../../store/workoutSessionStore";

type Draft = Record<string, { sets: string; reps: string; weight: string }>;

function buildDraft(items: TemplateItem[]): Draft {
  const next: Draft = {};
  items.forEach((item) => {
    next[item.id] = {
      sets: String(item.targetSets ?? ""),
      reps: String(item.targetReps ?? ""),
      weight: String(item.targetWeight ?? ""),
    };
  });
  return next;
}

export default function UpcomingWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const workout = useUpcomingWorkoutsStore((state) => state.getUpcomingWorkout(id));
  const updateItem = useUpcomingWorkoutsStore((state) => state.updateItem);
  const markStarted = useUpcomingWorkoutsStore((state) => state.markStarted);
  const activeSessionId = useWorkoutSessionStore((state) => state.sessionId);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>({});
  const [errorItemIds, setErrorItemIds] = useState<Set<string>>(new Set());

  if (!workout) {
    return null;
  }

  const handleEditPress = () => {
    setDraft(buildDraft(workout.items));
    setErrorItemIds(new Set());
    setIsEditing(true);
  };

  const handleCancelPress = () => {
    setIsEditing(false);
    setErrorItemIds(new Set());
  };

  const handleDraftChange = (
    itemId: string,
    field: "sets" | "reps" | "weight",
    value: string
  ) => {
    setDraft((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  };

  const handleSavePress = () => {
    const nextErrors = new Set<string>();
    const parsed: Record<
      string,
      { targetSets: number; targetReps: number; targetWeight: number }
    > = {};

    workout.items.forEach((item) => {
      const entry = draft[item.id];
      const sets = Number(entry?.sets);
      const reps = Number(entry?.reps);
      const weight = Number(entry?.weight);
      const valid =
        Number.isFinite(sets) &&
        sets > 0 &&
        Number.isFinite(reps) &&
        reps > 0 &&
        Number.isFinite(weight) &&
        weight > 0;

      if (!valid) {
        nextErrors.add(item.id);
      } else {
        parsed[item.id] = { targetSets: sets, targetReps: reps, targetWeight: weight };
      }
    });

    if (nextErrors.size > 0) {
      setErrorItemIds(nextErrors);
      return;
    }

    Object.entries(parsed).forEach(([itemId, updates]) => {
      updateItem(workout.id, itemId, updates);
    });
    setIsEditing(false);
  };

  const handleStart = () => {
    if (activeSessionId && activeSessionId !== workout.id) {
      appAlert(
        "진행 중인 운동이 있습니다",
        "새로 시작하면 기존 기록이 사라집니다.",
        [
          { text: "취소", style: "cancel" },
          {
            text: "새로 시작",
            style: "destructive",
            onPress: () => {
              markStarted(workout.id);
              router.push(`/workout/${workout.id}`);
            },
          },
        ],
      );
      return;
    }
    markStarted(workout.id);
    router.push(`/workout/${workout.id}`);
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>예정된 운동</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryCard}>
            <Image source={MUSCLE_GROUP_IMAGES[workout.muscleGroup]} style={styles.thumbnail} />
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryDate}>{workout.date}</Text>
              <Text style={styles.summaryName}>{workout.name}</Text>
              <Text style={styles.summaryMeta}>
                {workout.level} · {workout.duration}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>운동 목록</Text>
          <View style={styles.list}>
            {workout.items.map((item) => {
              const exercise = getExerciseById(item.exerciseId);
              const hasError = errorItemIds.has(item.id);

              if (!isEditing) {
                return (
                  <View key={item.id} style={styles.itemCard}>
                    <Text style={styles.itemName}>{exercise?.name ?? "알 수 없는 운동"}</Text>
                    <Text style={styles.itemTarget}>
                      {item.targetSets}세트 × {item.targetReps}회 × {item.targetWeight}kg
                    </Text>
                  </View>
                );
              }

              const entry = draft[item.id] ?? { sets: "", reps: "", weight: "" };
              return (
                <View key={item.id} style={styles.itemCard}>
                  <Text style={styles.itemName}>{exercise?.name ?? "알 수 없는 운동"}</Text>
                  <View style={styles.itemEditRow}>
                    <EditField
                      label="세트"
                      value={entry.sets}
                      hasError={hasError}
                      onChangeText={(value) => handleDraftChange(item.id, "sets", value)}
                    />
                    <EditField
                      label="횟수"
                      value={entry.reps}
                      hasError={hasError}
                      onChangeText={(value) => handleDraftChange(item.id, "reps", value)}
                    />
                    <EditField
                      label="무게(kg)"
                      value={entry.weight}
                      hasError={hasError}
                      onChangeText={(value) => handleDraftChange(item.id, "weight", value)}
                    />
                  </View>
                  {hasError && (
                    <Text style={styles.itemErrorText}>0보다 큰 숫자를 입력해주세요</Text>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.buttonRow}>
          {isEditing ? (
            <>
              <Pressable style={styles.secondaryButton} onPress={handleCancelPress}>
                <Text style={styles.secondaryButtonText}>취소</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={handleSavePress}>
                <Text style={styles.primaryButtonText}>저장</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={styles.secondaryButton} onPress={handleEditPress}>
                <Text style={styles.secondaryButtonText}>수정</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={handleStart}>
                <Text style={styles.primaryButtonText}>시작하기</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

type EditFieldProps = {
  label: string;
  value: string;
  hasError: boolean;
  onChangeText: (value: string) => void;
};

function EditField({ label, value, hasError, onChangeText }: EditFieldProps) {
  return (
    <View style={styles.itemInputGroup}>
      <Text style={styles.itemInputLabel}>{label}</Text>
      <TextInput
        style={[styles.itemInput, hasError && styles.itemInputError]}
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
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingBottom: 20,
    gap: 16,
  },
  summaryCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#1C1C25",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 16,
    ...CARD_SHADOW,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  summaryInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  summaryDate: {
    color: "#2DD4BF",
    fontSize: 12,
    fontWeight: "600",
  },
  summaryName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  summaryMeta: {
    color: "#A0A0A0",
    fontSize: 13,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  list: {
    gap: 10,
  },
  itemCard: {
    backgroundColor: "#1C1C25",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 14,
    gap: 4,
    ...CARD_SHADOW,
  },
  itemName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  itemTarget: {
    color: "#A0A0A0",
    fontSize: 13,
  },
  itemEditRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  itemInputGroup: {
    flex: 1,
    gap: 4,
  },
  itemInputLabel: {
    color: "#A0A0A0",
    fontSize: 11,
  },
  itemInput: {
    backgroundColor: "#0B0B0F",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    color: "#FFFFFF",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "transparent",
  },
  itemInputError: {
    borderColor: "#F87171",
  },
  itemErrorText: {
    color: "#F87171",
    fontSize: 11,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: SCREEN_HORIZONTAL_MARGIN,
    marginBottom: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#1C1C25",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#2DD4BF",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#0B0B0F",
    fontSize: 16,
    fontWeight: "700",
  },
});
