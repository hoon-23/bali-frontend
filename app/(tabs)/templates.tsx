import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN, TAB_BAR_BOTTOM_MARGIN, TAB_BAR_HEIGHT } from "../../constants/layout";
import { MUSCLE_GROUP_IMAGES } from "../../constants/muscleGroups";
import { toDisplayMuscleGroup } from "../../constants/exercises";
import { CARD_SHADOW } from "../../constants/shadow";
import { ApiExercise, formatExerciseName, useExerciseMap } from "../../hooks/api/useExercises";
import { ApiSessionDetail, useSessionHistory } from "../../hooks/api/useSessions";
import { getTodayISODate, useUpcomingSessions } from "../../hooks/api/useUpcomingSessions";
import { estimateSessionDurationMinutes } from "../../lib/session/sessionDisplay";

function formatUpcomingDateLabel(dateISO: string, todayISODate: string): string {
  const diffDays = Math.round(
    (new Date(dateISO).getTime() - new Date(todayISODate).getTime()) / 86400000
  );
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "내일";
  const date = new Date(dateISO);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatFullKoreanDate(dateISO: string): string {
  const date = new Date(dateISO);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function statusLabel(status: ApiSessionDetail["status"]): string {
  if (status === "COMPLETED") return "완료";
  if (status === "IN_PROGRESS") return "진행중";
  return "예정";
}

function firstExerciseThumbnail(
  session: { logs: { exerciseId: string }[] },
  exerciseMap: Map<string, ApiExercise>
) {
  const firstExerciseId = session.logs[0]?.exerciseId;
  const exercise = firstExerciseId ? exerciseMap.get(firstExerciseId) : undefined;
  return exercise ? toDisplayMuscleGroup(exercise.muscleGroup) : null;
}

export default function TemplatesScreen() {
  const router = useRouter();
  const exerciseMap = useExerciseMap();
  const today = getTodayISODate();

  const { data: upcomingSessions = [] } = useUpcomingSessions();
  const { data: pastSessionsRaw = [] } = useSessionHistory();

  // 오늘 시작한 세션은 status로 구분: 아직 SCHEDULED면 "예정된 운동"에,
  // IN_PROGRESS/COMPLETED면 "지난 기록"에 나온다.
  const upcoming = upcomingSessions
    .filter((session) => session.status === "SCHEDULED")
    .sort((a, b) => a.date.localeCompare(b.date));
  const pastSessions = pastSessionsRaw.filter((session) => session.status !== "SCHEDULED");

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleRow}>
            <Text style={styles.screenTitle}>기록</Text>
            <Pressable
              style={styles.addButton}
              onPress={() => router.push("/routines")}
              hitSlop={8}
            >
              <Ionicons name="add" size={22} color="#0B0B0F" />
            </Pressable>
          </View>

          <View>
            <Text style={styles.sectionTitle}>예정된 운동</Text>
            {upcoming.length === 0 ? (
              <Text style={styles.emptyText}>예정된 운동이 없어요.</Text>
            ) : (
              <View style={styles.list}>
                {upcoming.map((session) => {
                  const muscleGroup = firstExerciseThumbnail(session, exerciseMap);
                  return (
                    <Pressable
                      key={session.id}
                      style={styles.upcomingRow}
                      onPress={() => router.push(`/upcoming/${session.id}`)}
                    >
                      {muscleGroup && (
                        <Image source={MUSCLE_GROUP_IMAGES[muscleGroup]} style={styles.thumbnail} />
                      )}
                      <View style={styles.upcomingInfo}>
                        <Text style={styles.upcomingDate}>
                          {formatUpcomingDateLabel(session.date, today)}
                        </Text>
                        <Text style={styles.upcomingName}>{session.title}</Text>
                        <Text style={styles.upcomingMeta}>
                          {estimateSessionDurationMinutes(session.logs)}분
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#6B6B6B" />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <View>
            <Text style={styles.sectionTitle}>지난 기록</Text>
            {pastSessions.length === 0 ? (
              <Text style={styles.emptyText}>지난 기록이 없어요.</Text>
            ) : (
              <View style={styles.list}>
                {pastSessions.map((session) => {
                  const exerciseNames = session.logs
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((log) => {
                      const exercise = exerciseMap.get(log.exerciseId);
                      return exercise ? formatExerciseName(exercise) : "알 수 없는 운동";
                    })
                    .join(", ");
                  const isInProgress = session.status === "IN_PROGRESS";
                  return (
                    <Pressable
                      key={session.id}
                      style={styles.recordCard}
                      onPress={() => router.push(`/records/${session.id}`)}
                    >
                      <View style={styles.recordHeader}>
                        <View>
                          <Text style={styles.recordDate}>{formatFullKoreanDate(session.date)}</Text>
                          <Text style={styles.recordCategory}>{session.title}</Text>
                        </View>
                        <View style={[styles.statusBadge, isInProgress && styles.statusBadgeActive]}>
                          <Text
                            style={[
                              styles.statusBadgeText,
                              isInProgress && styles.statusBadgeTextActive,
                            ]}
                          >
                            {statusLabel(session.status)}
                          </Text>
                        </View>
                      </View>
                      {exerciseNames.length > 0 && (
                        <Text style={styles.recordExercises} numberOfLines={2}>
                          {exerciseNames}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingTop: 12,
    paddingBottom: TAB_BAR_BOTTOM_MARGIN + TAB_BAR_HEIGHT + 24,
    gap: 24,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  screenTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2DD4BF",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  emptyText: {
    color: "#6B6B6B",
    fontSize: 13,
  },
  list: {
    gap: 12,
  },
  upcomingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1C1C25",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 12,
    ...CARD_SHADOW,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingDate: {
    color: "#2DD4BF",
    fontSize: 11,
    fontWeight: "600",
  },
  upcomingName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  upcomingMeta: {
    color: "#A0A0A0",
    fontSize: 12,
    marginTop: 2,
  },
  recordCard: {
    backgroundColor: "#1C1C25",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 16,
    gap: 8,
    ...CARD_SHADOW,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  recordDate: {
    color: "#A0A0A0",
    fontSize: 12,
  },
  recordCategory: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(45, 212, 191, 0.15)",
  },
  statusBadgeActive: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
  },
  statusBadgeText: {
    color: "#2DD4BF",
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadgeTextActive: {
    color: "#FBBF24",
  },
  recordExercises: {
    color: "#A0A0A0",
    fontSize: 13,
  },
});
