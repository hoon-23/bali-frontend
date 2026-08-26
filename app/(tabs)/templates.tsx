import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import {
  IN_PROGRESS_BANNER_RESERVED_HEIGHT,
  SCREEN_HORIZONTAL_MARGIN,
  TAB_BAR_BOTTOM_MARGIN,
  TAB_BAR_HEIGHT,
} from "../../constants/layout";
import { MUSCLE_GROUP_IMAGES } from "../../constants/muscleGroups";
import { toDisplayMuscleGroup } from "../../constants/exercises";
import { CARD_SHADOW } from "../../constants/shadow";
import { ApiExercise, formatExerciseName, useExerciseMap } from "../../hooks/api/useExercises";
import { useInProgressSessionId } from "../../hooks/api/useInProgressSession";
import { ApiSessionDetail, useSessionHistory } from "../../hooks/api/useSessions";
import { getTodayISODate, useUpcomingSessions } from "../../hooks/api/useUpcomingSessions";
import { recordsTabBarCollapse } from "../../lib/recordsScroll";
import { estimateSessionDurationMinutes } from "../../lib/session/sessionDisplay";

// 맨 위 근처(오버스크롤 포함)에서는 스와이프 방향과 무관하게 항상 펼친 상태로 고정 —
// 안 그러면 맨 위에서 아래로 당기는 제스처(오버스크롤)의 offset이 흔들리면서
// 방향 판정이 뒤집혀 사라지는 버그가 생긴다.
const COLLAPSE_START_OFFSET = 20;
// 이 정도 미만의 스크롤 변화량은 손떨림/관성 잔여값으로 보고 무시한다.
const SCROLL_DELTA_THRESHOLD = 4;

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
  const {
    data: historyPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSessionHistory();
  const inProgressSessionId = useInProgressSessionId();

  // 오늘 시작한 세션은 status로 구분: 아직 SCHEDULED면 "예정된 운동"에,
  // IN_PROGRESS/COMPLETED면 "지난 기록"에 나온다.
  const upcoming = upcomingSessions
    .filter((session) => session.status === "SCHEDULED")
    .sort((a, b) => a.date.localeCompare(b.date));
  const pastSessions = (historyPages?.pages.flatMap((page) => page.content) ?? []).filter(
    (session) => session.status !== "SCHEDULED"
  );

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const lastOffsetRef = useRef(0);
  const isCollapsedRef = useRef(false);

  const setTabBarCollapsed = (collapsed: boolean) => {
    if (isCollapsedRef.current === collapsed) return;
    isCollapsedRef.current = collapsed;
    Animated.timing(recordsTabBarCollapse, {
      toValue: collapsed ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const delta = offsetY - lastOffsetRef.current;
    lastOffsetRef.current = offsetY;

    if (offsetY <= COLLAPSE_START_OFFSET) {
      setTabBarCollapsed(false);
    } else if (delta > SCROLL_DELTA_THRESHOLD) {
      setTabBarCollapsed(true);
    } else if (delta < -SCROLL_DELTA_THRESHOLD) {
      setTabBarCollapsed(false);
    }
  };

  // 이 탭에 들어올 때마다 탭바/배너가 항상 원래 크기로 시작하게 초기화한다
  // (다른 탭에서는 이 값을 안 건드리니 떠날 때 줄어든 채였다면 그대로 남아있을 수 있어서).
  useFocusEffect(
    useCallback(() => {
      lastOffsetRef.current = 0;
      isCollapsedRef.current = false;
      recordsTabBarCollapse.setValue(0);
    }, [])
  );

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <FlatList
          data={pastSessions}
          keyExtractor={(session) => session.id}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ItemSeparatorComponent={() => <View style={styles.recordSeparator} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
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

              <Text style={styles.sectionTitle}>지난 기록</Text>
            </View>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>지난 기록이 없어요.</Text>}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={styles.footerLoading} color="#2DD4BF" />
            ) : null
          }
          renderItem={({ item: session }) => {
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
          }}
          contentContainerStyle={[
            styles.scrollContent,
            inProgressSessionId && {
              paddingBottom: styles.scrollContent.paddingBottom + IN_PROGRESS_BANNER_RESERVED_HEIGHT,
            },
          ]}
          showsVerticalScrollIndicator={false}
        />
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
  },
  listHeader: {
    gap: 24,
    marginBottom: 24,
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
  recordSeparator: {
    height: 12,
  },
  footerLoading: {
    paddingVertical: 16,
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
