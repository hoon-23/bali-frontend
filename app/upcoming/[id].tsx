import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { appAlert } from "../../lib/alert";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { toDisplayMuscleGroup } from "../../constants/exercises";
import { MUSCLE_GROUP_IMAGES } from "../../constants/muscleGroups";
import { CARD_SHADOW } from "../../constants/shadow";
import { formatExerciseName, useExerciseMap } from "../../hooks/api/useExercises";
import { ApiSessionLogDetail, useSession, usePatchSession } from "../../hooks/api/useSessions";
import { getTodayISODate } from "../../hooks/api/useUpcomingSessions";
import { estimateSessionDurationMinutes } from "../../lib/session/sessionDisplay";
import { useWorkoutSessionStore } from "../../store/workoutSessionStore";

type Draft = Record<string, { sets: string; reps: string; weight: string }>;

function buildDraft(logs: ApiSessionLogDetail[]): Draft {
  const next: Draft = {};
  logs.forEach((log) => {
    next[log.id] = {
      sets: String(log.targetSets ?? ""),
      reps: String(log.targetReps ?? ""),
      weight: String(log.targetWeight ?? ""),
    };
  });
  return next;
}

function formatDateLabel(dateISO: string, todayISODate: string): string {
  const diffDays = Math.round(
    (new Date(dateISO).getTime() - new Date(todayISODate).getTime()) / 86400000
  );
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "내일";
  const date = new Date(dateISO);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default function UpcomingWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession(id);
  const exerciseMap = useExerciseMap();
  const patchSession = usePatchSession();
  const activeSessionId = useWorkoutSessionStore((state) => state.sessionId);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>({});
  const [errorLogIds, setErrorLogIds] = useState<Set<string>>(new Set());
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!session) {
    return null;
  }

  const logs = session.logs.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const firstExercise = logs[0] ? exerciseMap.get(logs[0].exerciseId) : undefined;
  const muscleGroup = firstExercise ? toDisplayMuscleGroup(firstExercise.muscleGroup) : null;

  const handleEditPress = () => {
    setDraft(buildDraft(logs));
    setErrorLogIds(new Set());
    setIsEditing(true);
  };

  const handleCancelPress = () => {
    setIsEditing(false);
    setErrorLogIds(new Set());
  };

  const handleDraftChange = (logId: string, field: "sets" | "reps" | "weight", value: string) => {
    setDraft((prev) => ({ ...prev, [logId]: { ...prev[logId], [field]: value } }));
  };

  const handleSavePress = async () => {
    const nextErrors = new Set<string>();
    const updateItems = logs.map((log) => {
      const entry = draft[log.id];
      const sets = Number(entry?.sets);
      const reps = Number(entry?.reps);
      const weight = Number(entry?.weight);
      const valid =
        Number.isFinite(sets) && sets > 0 && Number.isFinite(reps) && reps > 0 &&
        Number.isFinite(weight) && weight > 0;

      if (!valid) nextErrors.add(log.id);

      return {
        logId: log.id,
        exerciseId: log.exerciseId,
        sortOrder: log.sortOrder,
        targetSets: valid ? sets : log.targetSets ?? undefined,
        targetReps: valid ? reps : log.targetReps ?? undefined,
        targetWeight: valid ? weight : log.targetWeight ?? undefined,
      };
    });

    if (nextErrors.size > 0) {
      setErrorLogIds(nextErrors);
      return;
    }

    setSaving(true);
    try {
      await patchSession.mutateAsync({ sessionId: id, updateItems });
      setIsEditing(false);
    } catch {
      appAlert("수정 사항을 저장하지 못했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async () => {
    if (activeSessionId && activeSessionId !== id) {
      appAlert(
        "진행 중인 운동이 있습니다",
        "새로 시작하면 기존 기록이 사라집니다.",
        [
          { text: "취소", style: "cancel" },
          { text: "새로 시작", style: "destructive", onPress: () => startWorkout() },
        ],
      );
      return;
    }
    startWorkout();
  };

  const startWorkout = async () => {
    setStarting(true);
    try {
      await patchSession.mutateAsync({ sessionId: id, status: "IN_PROGRESS" });
      router.push(`/workout/${id}`);
    } catch {
      appAlert("운동을 시작하지 못했어요. 다시 시도해주세요.");
    } finally {
      setStarting(false);
    }
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
            {muscleGroup && (
              <Image source={MUSCLE_GROUP_IMAGES[muscleGroup]} style={styles.thumbnail} />
            )}
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryDate}>{formatDateLabel(session.date, getTodayISODate())}</Text>
              <Text style={styles.summaryName}>{session.title}</Text>
              <Text style={styles.summaryMeta}>
                {estimateSessionDurationMinutes(logs)}분 · {logs.length}개 운동
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>운동 목록</Text>
          <View style={styles.list}>
            {logs.map((log) => {
              const exercise = exerciseMap.get(log.exerciseId);
              const exerciseName = exercise ? formatExerciseName(exercise) : "알 수 없는 운동";
              const hasError = errorLogIds.has(log.id);

              if (!isEditing) {
                return (
                  <View key={log.id} style={styles.itemCard}>
                    <Text style={styles.itemName}>{exerciseName}</Text>
                    <Text style={styles.itemTarget}>
                      {log.targetSets ?? 0}세트 × {log.targetReps ?? 0}회 × {log.targetWeight ?? 0}kg
                    </Text>
                  </View>
                );
              }

              const entry = draft[log.id] ?? { sets: "", reps: "", weight: "" };
              return (
                <View key={log.id} style={styles.itemCard}>
                  <Text style={styles.itemName}>{exerciseName}</Text>
                  <View style={styles.itemEditRow}>
                    <EditField
                      label="세트"
                      value={entry.sets}
                      hasError={hasError}
                      onChangeText={(value) => handleDraftChange(log.id, "sets", value)}
                    />
                    <EditField
                      label="횟수"
                      value={entry.reps}
                      hasError={hasError}
                      onChangeText={(value) => handleDraftChange(log.id, "reps", value)}
                    />
                    <EditField
                      label="무게(kg)"
                      value={entry.weight}
                      hasError={hasError}
                      onChangeText={(value) => handleDraftChange(log.id, "weight", value)}
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
              <Pressable style={styles.secondaryButton} onPress={handleCancelPress} disabled={saving}>
                <Text style={styles.secondaryButtonText}>취소</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={handleSavePress} disabled={saving}>
                <Text style={styles.primaryButtonText}>{saving ? "저장하는 중..." : "저장"}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={styles.secondaryButton} onPress={handleEditPress}>
                <Text style={styles.secondaryButtonText}>수정</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={handleStart} disabled={starting}>
                <Text style={styles.primaryButtonText}>{starting ? "시작하는 중..." : "시작하기"}</Text>
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
