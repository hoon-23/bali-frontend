import { ChevronLeft } from "lucide-react-native";
import { colors, radius, space, type } from "../../constants/theme";
import { PressableScale } from "../../components/ui/PressableScale";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { QuietButton } from "../../components/ui/QuietButton";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { appAlert } from "../../lib/alert";
import { getKoreanApiErrorMessage } from "../../lib/api/planLimit";
import { sanitizeWeightInput } from "../../lib/format/numberInput";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppTextInput } from "../../components/AppTextInput";
import { KeyboardDismissView, keyboardScrollProps } from "../../components/KeyboardDismissView";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { isBodyweightExercise, toDisplayMuscleGroup } from "../../constants/exercises";
import { MUSCLE_GROUP_IMAGES } from "../../constants/muscleGroups";
import { formatExerciseName, isCardioExercise, useExerciseMap } from "../../hooks/api/useExercises";
import { ApiSessionLogDetail, useDeleteSession, useSession, usePatchSession } from "../../hooks/api/useSessions";
import { getTodayISODate } from "../../hooks/api/useUpcomingSessions";
import { estimateSessionDurationMinutes } from "../../lib/session/sessionDisplay";
import { useWorkoutSessionStore } from "../../store/workoutSessionStore";

// minutes는 유산소(CARDIO) 종목의 목표 시간(분) — 서버 exercise.type 기준으로 sets/reps/weight와 배타적으로 쓴다.
type Draft = Record<string, { sets: string; reps: string; weight: string; minutes: string }>;

function buildDraft(logs: ApiSessionLogDetail[]): Draft {
  const next: Draft = {};
  logs.forEach((log) => {
    next[log.id] = {
      sets: String(log.targetSets ?? ""),
      reps: String(log.targetReps ?? ""),
      weight: String(log.targetWeight ?? ""),
      minutes: log.targetDurationSeconds != null ? String(Math.round(log.targetDurationSeconds / 60)) : "",
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
  const { data: session, isError: sessionLoadFailed } = useSession(id);
  const exerciseMap = useExerciseMap();
  const patchSession = usePatchSession();
  const deleteSession = useDeleteSession();
  const activeSessionId = useWorkoutSessionStore((state) => state.sessionId);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>({});
  const [errorLogIds, setErrorLogIds] = useState<Set<string>>(new Set());
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // 알림 등으로 이미 삭제됐거나 없는 세션에 들어오면 빈 화면에 갇히지 않게 돌아간다.
  useEffect(() => {
    if (sessionLoadFailed) router.back();
  }, [sessionLoadFailed, router]);

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

  const handleDraftChange = (logId: string, field: "sets" | "reps" | "weight" | "minutes", value: string) => {
    const nextValue = field === "weight" ? sanitizeWeightInput(value) : value;
    setDraft((prev) => ({ ...prev, [logId]: { ...prev[logId], [field]: nextValue } }));
  };

  const handleSavePress = async () => {
    const nextErrors = new Set<string>();
    const updateItems = logs.map((log) => {
      const entry = draft[log.id];
      if (isCardioExercise(exerciseMap.get(log.exerciseId))) {
        // 유산소는 목표 시간만 보낸다(sets/reps/weight를 같이 보내면 서버가 400).
        const minutes = Number(entry?.minutes);
        const valid = Number.isFinite(minutes) && minutes > 0;
        if (!valid) nextErrors.add(log.id);
        return {
          logId: log.id,
          exerciseId: log.exerciseId,
          sortOrder: log.sortOrder,
          targetDurationSeconds: valid ? minutes * 60 : log.targetDurationSeconds ?? undefined,
        };
      }
      const sets = Number(entry?.sets);
      const reps = Number(entry?.reps);
      // 맨몸 종목은 무게 입력란이 없으므로 검증을 건너뛰고 weight=0으로 보낸다
      const isBodyweight = isBodyweightExercise(exerciseMap.get(log.exerciseId));
      const weight = isBodyweight ? 0 : Number(entry?.weight);
      const valid =
        Number.isFinite(sets) && sets > 0 && Number.isFinite(reps) && reps > 0 &&
        Number.isFinite(weight) && (isBodyweight || weight > 0);

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
    } catch (error) {
      appAlert(getKoreanApiErrorMessage(error) ?? "수정 사항을 저장하지 못했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleStart = () => {
    const todayISODate = getTodayISODate();
    // 예약일과 실제 시작일이 다르면(미래로 예약해둔 걸 당겨서 시작, 또는 예약일을 놓치고
    // 뒤늦게 시작) 기록/주간·월간 집계가 실제 수행일이 아니라 예약일 기준으로 잡혀버린다 —
    // 확인 후 date를 오늘로 보정해서 시작한다.
    const needsDateCorrection = session.date !== todayISODate;

    const proceedPastConflictCheck = () => {
      if (activeSessionId && activeSessionId !== id) {
        appAlert(
          "진행 중인 운동이 있습니다",
          "새로 시작하면 기존 기록이 사라집니다.",
          [
            { text: "취소", style: "cancel" },
            { text: "새로 시작", style: "destructive", onPress: () => startWorkout(needsDateCorrection) },
          ],
        );
        return;
      }
      startWorkout(needsDateCorrection);
    };

    if (needsDateCorrection) {
      const scheduledDate = new Date(session.date);
      appAlert(
        `${scheduledDate.getMonth() + 1}월 ${scheduledDate.getDate()}일 운동입니다`,
        "오늘 날짜로 진행하시겠습니까?",
        [
          { text: "취소", style: "cancel" },
          { text: "진행", onPress: proceedPastConflictCheck },
        ],
      );
      return;
    }
    proceedPastConflictCheck();
  };

  const startWorkout = async (correctDateToToday: boolean) => {
    setStarting(true);
    try {
      await patchSession.mutateAsync({
        sessionId: id,
        status: "IN_PROGRESS",
        ...(correctDateToToday ? { date: getTodayISODate() } : {}),
      });
      // 예약 출신 표시 — 기록 없이 종료하면 삭제 대신 예약으로 되돌린다.
      useWorkoutSessionStore.getState().markScheduledOrigin(id);
      router.push(`/workout/${id}`);
    } catch {
      appAlert("운동을 시작하지 못했어요. 다시 시도해주세요.");
    } finally {
      setStarting(false);
    }
  };

  const handleCancelSchedule = () => {
    appAlert("예약을 취소할까요?", "예정된 운동에서 삭제됩니다.", [
      { text: "돌아가기", style: "cancel" },
      {
        text: "예약 취소",
        style: "destructive",
        onPress: async () => {
          setCancelling(true);
          try {
            await deleteSession.mutateAsync(id);
            router.back();
          } catch {
            appAlert("예약 취소에 실패했어요. 다시 시도해주세요.");
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  return (
    <ScreenBackground>
      {/* 하단 버튼이 홈 인디케이터 영역에 걸려 잘리지 않게 아래 여백도 반영한다. */}
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <PressableScale style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={20} color={colors.text} />
          </PressableScale>
          <Text style={styles.headerTitle}>예정된 운동</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
          {...keyboardScrollProps}
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

              const isCardio = isCardioExercise(exercise);

              if (!isEditing) {
                return (
                  <View key={log.id} style={styles.itemCard}>
                    <Text style={styles.itemName}>{exerciseName}</Text>
                    {isCardio ? (
                      Math.round((log.targetDurationSeconds ?? 0) / 60) > 0 ? (
                        <Text style={styles.itemTarget}>{Math.round((log.targetDurationSeconds ?? 0) / 60)}분</Text>
                      ) : null
                    ) : (
                    <Text style={styles.itemTarget}>
                      {log.targetSets ?? 0}세트 × {log.targetReps ?? 0}회
                      {isBodyweightExercise(exercise) ? "" : ` × ${log.targetWeight ?? 0}kg`}
                    </Text>
                    )}
                  </View>
                );
              }

              const entry = draft[log.id] ?? { sets: "", reps: "", weight: "", minutes: "" };
              return (
                <View key={log.id} style={styles.itemCard}>
                  <Text style={styles.itemName}>{exerciseName}</Text>
                  <View style={styles.itemEditRow}>
                    {isCardio ? (
                      <EditField
                        label="목표 시간(분)"
                        value={entry.minutes}
                        hasError={hasError}
                        onChangeText={(value) => handleDraftChange(log.id, "minutes", value)}
                      />
                    ) : (
                    <>
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
                    {!isBodyweightExercise(exercise) && (
                      <EditField
                        label="무게(kg)"
                        value={entry.weight}
                        hasError={hasError}
                        onChangeText={(value) => handleDraftChange(log.id, "weight", value)}
                      />
                    )}
                    </>
                    )}
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
              <QuietButton title="취소" onPress={handleCancelPress} disabled={saving} style={styles.rowButton} />
              <PrimaryButton
                title={saving ? "저장하는 중..." : "저장"}
                onPress={handleSavePress}
                disabled={saving}
                style={styles.rowButton}
              />
            </>
          ) : (
            <>
              <QuietButton title="수정" onPress={handleEditPress} style={styles.rowButton} />
              <PrimaryButton
                title={starting ? "시작하는 중..." : "운동 시작"}
                onPress={handleStart}
                disabled={starting}
                style={styles.rowButton}
              />
            </>
          )}
        </View>

        {!isEditing && session.status === "SCHEDULED" && (
          <View style={styles.cancelScheduleRow}>
            <QuietButton
              variant="text"
              tone="danger"
              title={cancelling ? "취소하는 중..." : "예약 취소"}
              onPress={handleCancelSchedule}
              disabled={cancelling}
            />
          </View>
        )}
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
      <AppTextInput
        style={[styles.itemInput, hasError && styles.itemInputError]}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={colors.text3}
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
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingBottom: space.s40,
    gap: space.s16,
  },
  // 요약은 상자 없이 아래 얇은 선으로만 나눈다(DESIGN.md: 상자를 기본으로 쓰지 않는다).
  summaryCard: {
    flexDirection: "row",
    gap: space.s16,
    alignItems: "center",
    paddingBottom: space.s16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.16)",
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: radius.control,
  },
  summaryInfo: {
    flex: 1,
    justifyContent: "center",
    gap: space.s4,
  },
  summaryDate: {
    ...type.meta,
    color: colors.text3,
  },
  summaryName: {
    ...type.heading,
    color: colors.text,
  },
  summaryMeta: {
    ...type.label,
    fontWeight: "400",
    color: colors.text2,
    fontVariant: ["tabular-nums"],
  },
  sectionTitle: {
    ...type.meta,
    color: colors.text3,
  },
  list: {
    gap: 0,
  },
  itemCard: {
    paddingVertical: space.s12,
    gap: space.s4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.16)",
  },
  itemName: {
    ...type.body,
    fontWeight: "600",
    color: colors.text,
  },
  itemTarget: {
    ...type.label,
    fontWeight: "400",
    color: colors.text2,
    fontVariant: ["tabular-nums"],
  },
  itemEditRow: {
    flexDirection: "row",
    gap: space.s8,
    marginTop: space.s8,
  },
  itemInputGroup: {
    flex: 1,
    gap: space.s4,
  },
  itemInputLabel: {
    ...type.meta,
    color: colors.text3,
  },
  itemInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    paddingVertical: space.s12,
    paddingHorizontal: space.s12,
    color: colors.text,
    ...type.body,
    borderWidth: 1,
    borderColor: "transparent",
  },
  itemInputError: {
    borderColor: colors.danger,
  },
  itemErrorText: {
    ...type.meta,
    color: colors.danger,
    marginTop: space.s4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: space.s12,
    marginHorizontal: SCREEN_HORIZONTAL_MARGIN,
    marginBottom: space.s4,
  },
  rowButton: {
    flex: 1,
  },
  cancelScheduleRow: {
    alignItems: "center",
    paddingVertical: space.s12,
  },
});
