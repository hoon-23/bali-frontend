import { ChevronRight, Plus } from "lucide-react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useScrollToTop } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../../components/AppText";
import { ScreenBackground } from "../../components/ScreenBackground";
import { LogoMark } from "../../components/LogoMark";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { PressableScale } from "../../components/ui/PressableScale";
import { colors, radius, space, type } from "../../constants/theme";
import { Skeleton } from "../../components/Skeleton";
import {
  IN_PROGRESS_BANNER_RESERVED_HEIGHT,
  SCREEN_HORIZONTAL_MARGIN,
  TAB_BAR_BOTTOM_MARGIN,
  TAB_BAR_HEIGHT,
} from "../../constants/layout";
import { MUSCLE_GROUP_IMAGES } from "../../constants/muscleGroups";
import { toDisplayMuscleGroup } from "../../constants/exercises";
import {
  ApiExercise,
  formatExerciseName,
  isCardioExercise,
  useExerciseMap,
  useExercises,
} from "../../hooks/api/useExercises";
import { isEmptyFinishedSession } from "../../lib/session/logRecord";
import { useInProgressSessionId } from "../../hooks/api/useInProgressSession";
import { ApiSessionDetail, useSessionHistory } from "../../hooks/api/useSessions";
import { getTodayISODate, useUpcomingSessions } from "../../hooks/api/useUpcomingSessions";
import { useRoutineEntry } from "../../hooks/useRoutineEntry";
import { recordsTabBarCollapse } from "../../lib/recordsScroll";
import { estimateSessionDurationMinutes } from "../../lib/session/sessionDisplay";

// 최초 로딩 중에 보여줄 카드 모양 스켈레톤 개수
const UPCOMING_SKELETON_COUNT = 2;
const RECORD_SKELETON_COUNT = 3;

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
  if (status === "ABANDONED") return "중단";
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
  const { noRoutines, openRoutines, openAddMenu } = useRoutineEntry();
  const exerciseMap = useExerciseMap();
  // 운동 이름 맵이 아직 한 번도 안 왔을 때 — 이때는 "알 수 없는 운동" 대신 스켈레톤 줄을 보인다.
  const { isPending: exercisesPending } = useExercises();
  const today = getTodayISODate();

  // isPending은 캐시에 데이터가 아직 없을 때만 true라서, 백그라운드 재조회·당겨서 새로고침 중에는
  // 기존 목록이 그대로 유지되고 스켈레톤으로 되돌아가지 않는다.
  const {
    data: upcomingSessions = [],
    isPending: upcomingPending,
    refetch: refetchUpcoming,
  } = useUpcomingSessions();
  const {
    data: historyPages,
    isPending: historyPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchHistory,
  } = useSessionHistory();
  const inProgressSessionId = useInProgressSessionId();
  const insets = useSafeAreaInsets();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchUpcoming(), refetchHistory()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchUpcoming, refetchHistory]);

  // 오늘 시작한 세션은 status로 구분: 아직 SCHEDULED면 "예정된 운동"에,
  // IN_PROGRESS/COMPLETED면 "지난 기록"에 나온다.
  // useUpcomingSessions가 자정 롤오버 대응으로 어제 날짜부터 조회해오므로, 여기서는
  // 오늘 이전 날짜의 SCHEDULED(예: 시작 안 하고 지나간 예약)가 섞여 들어오지 않게 걸러낸다.
  const upcoming = upcomingSessions
    .filter((session) => session.status === "SCHEDULED" && session.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const pastSessions = (historyPages?.pages.flatMap((page) => page.content) ?? []).filter(
    (session) => session.status !== "SCHEDULED"
  ).filter(
    // 기록 없이 종료된 빈 세션은 서버엔 두고 목록에서만 숨긴다
    (session) =>
      !isEmptyFinishedSession(session, (exerciseId) => {
        const exercise = exerciseMap.get(exerciseId);
        return exercise ? isCardioExercise(exercise) : null;
      })
  );

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const listRef = useRef<FlatList<ApiSessionDetail>>(null);
  // 이미 선택된 탭을 다시 누르면 맨 위로 올라간다.
  useScrollToTop(listRef);
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
          ref={listRef}
          data={pastSessions}
          keyExtractor={(session) => session.id}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.text2}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.recordSeparator} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.titleRow}>
                <Text style={styles.screenTitle}>기록</Text>
                <PressableScale
                  style={styles.addButton}
                  onPress={openAddMenu}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="운동 시작 또는 루틴 만들기"
                >
                  <Plus size={22} color={colors.text} />
                </PressableScale>
              </View>

              <View>
                <Text style={styles.sectionTitle}>예정된 운동</Text>
                {upcomingPending ? (
                  <View style={styles.list}>
                    {Array.from({ length: UPCOMING_SKELETON_COUNT }, (_, index) => (
                      <UpcomingRowSkeleton key={index} />
                    ))}
                  </View>
                ) : upcoming.length === 0 ? (
                  <Text style={styles.emptyText}>예정된 운동이 없어요.</Text>
                ) : (
                  <View style={styles.list}>
                    {upcoming.map((session) => {
                      const muscleGroup = firstExerciseThumbnail(session, exerciseMap);
                      return (
                        <PressableScale
                          key={session.id}
                          style={styles.upcomingRow}
                          onPress={() => router.push(`/upcoming/${session.id}`)}
                        >
                          {muscleGroup ? (
                            <Image source={MUSCLE_GROUP_IMAGES[muscleGroup]} style={styles.thumbnail} />
                          ) : exercisesPending ? (
                            // 운동 정보가 오기 전에도 썸네일 자리를 잡아 글자가 옆으로 밀리지 않게 한다.
                            <Skeleton width={52} height={52} radius={12} />
                          ) : null}
                          <View style={styles.upcomingInfo}>
                            <Text style={styles.upcomingDate}>
                              {formatUpcomingDateLabel(session.date, today)}
                            </Text>
                            <Text style={styles.upcomingName}>{session.title}</Text>
                            <Text style={styles.upcomingMeta}>
                              {estimateSessionDurationMinutes(session.logs)}분
                            </Text>
                          </View>
                          <ChevronRight size={18} color={colors.text3} />
                        </PressableScale>
                      );
                    })}
                  </View>
                )}
              </View>

              <Text style={styles.sectionTitle}>지난 기록</Text>
            </View>
          }
          ListEmptyComponent={
            historyPending ? (
              <View style={styles.list}>
                {Array.from({ length: RECORD_SKELETON_COUNT }, (_, index) => (
                  <RecordCardSkeleton key={index} />
                ))}
              </View>
            ) : (
              // 기록이 아직 없는 사람에게 — 무엇을 하면 여기가 채워지는지와 그 버튼을 함께 보여준다.
              // 로고는 흐리게 둔다(아직 기록이 없다).
              <View style={styles.historyEmpty}>
                <LogoMark width={120} tone="muted" />
                <AppText style={styles.historyEmptyTitle}>아직 운동 기록이 없어요</AppText>
                <AppText style={styles.historyEmptyBody}>운동을 끝내면 여기에 기록이 남아요</AppText>
                <PrimaryButton
                  title={noRoutines ? "첫 루틴 만들기" : "첫 운동 시작"}
                  onPress={openRoutines}
                  style={styles.historyEmptyButton}
                />
              </View>
            )
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={styles.footerLoading} color={colors.text2} />
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
            const isAbandoned = session.status === "ABANDONED";
            return (
              <PressableScale
                style={styles.recordCard}
                onPress={() => router.push(`/records/${session.id}`)}
              >
                <View style={styles.recordHeader}>
                  <View>
                    <Text style={styles.recordDate}>{formatFullKoreanDate(session.date)}</Text>
                    <Text style={styles.recordCategory}>{session.title}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      isInProgress && styles.statusBadgeActive,
                      isAbandoned && styles.statusBadgeAbandoned,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isInProgress && styles.statusBadgeTextActive,
                        isAbandoned && styles.statusBadgeTextAbandoned,
                      ]}
                    >
                      {statusLabel(session.status)}
                    </Text>
                  </View>
                </View>
                {exercisesPending && session.logs.length > 0 ? (
                  // 운동 이름 맵이 오기 전에는 "알 수 없는 운동" 대신 한 줄 높이의 스켈레톤을 둔다.
                  <Skeleton width="70%" height={13} style={styles.textLineSkeleton} />
                ) : (
                  exerciseNames.length > 0 && (
                    <Text style={styles.recordExercises} numberOfLines={2}>
                      {exerciseNames}
                    </Text>
                  )
                )}
              </PressableScale>
            );
          }}
          contentContainerStyle={[
            styles.scrollContent,
            {
              // SafeAreaView edges=["top"]이라 insets.bottom이 반영 안 돼 마지막 카드가
              // 탭바와 겹쳐 보이던 문제 — 여기서 insets.bottom을 더해 맞춘다.
              paddingBottom:
                insets.bottom +
                TAB_BAR_BOTTOM_MARGIN +
                TAB_BAR_HEIGHT +
                (inProgressSessionId ? IN_PROGRESS_BANNER_RESERVED_HEIGHT + 24 : 24),
            },
          ]}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

// 예정된 운동 행과 같은 틀(패딩·썸네일 크기)로 그린 로딩용 자리표시.
function UpcomingRowSkeleton() {
  return (
    <View style={styles.upcomingRow}>
      <Skeleton width={52} height={52} radius={12} />
      <View style={[styles.upcomingInfo, styles.skeletonLines]}>
        <Skeleton width={40} height={11} />
        <Skeleton width="55%" height={15} />
        <Skeleton width={32} height={12} />
      </View>
    </View>
  );
}

// 지난 기록 카드와 같은 틀(날짜·제목·상태 배지·운동 이름 줄)로 그린 로딩용 자리표시.
function RecordCardSkeleton() {
  return (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.skeletonLines}>
          <Skeleton width={96} height={12} />
          <Skeleton width={120} height={16} />
        </View>
        <Skeleton width={44} height={24} radius={12} />
      </View>
      <Skeleton width="70%" height={13} style={styles.textLineSkeleton} />
    </View>
  );
}

const styles = StyleSheet.create({
  // 스켈레톤 줄 사이 간격 — 실제 글자 줄 높이(폰트 크기 + 여백)와 비슷하게 맞춘다.
  skeletonLines: {
    gap: 5,
  },
  // 한 줄 텍스트(13pt) 높이에 맞추기 위한 위아래 여백.
  textLineSkeleton: {
    marginVertical: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingTop: 12,
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
    ...type.title,
    color: colors.text,
    letterSpacing: -0.6,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    ...type.meta,
    color: colors.text3,
    marginBottom: space.s12,
  },
  historyEmpty: {
    alignItems: "center",
    paddingTop: space.s32,
    paddingBottom: space.s16,
  },
  historyEmptyTitle: {
    ...type.heading,
    color: colors.text,
    marginTop: space.s20,
  },
  historyEmptyBody: {
    ...type.body,
    color: colors.text2,
    marginTop: space.s8,
  },
  historyEmptyButton: {
    alignSelf: "stretch",
    marginTop: space.s24,
  },
  emptyText: {
    ...type.body,
    color: colors.text2,
  },
  list: {
    gap: space.s16,
  },
  recordSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    marginVertical: space.s16,
  },
  footerLoading: {
    paddingVertical: 16,
  },
  upcomingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.s12,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: radius.control,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingDate: {
    color: colors.text2,
    fontSize: 11,
    fontWeight: "600",
  },
  upcomingName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
  upcomingMeta: {
    color: colors.text3,
    fontSize: 12,
    marginTop: 2,
  },
  recordCard: {
    gap: space.s8,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  recordDate: {
    color: colors.text3,
    fontSize: 12,
  },
  recordCategory: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
  },
  statusBadgeActive: {
    paddingVertical: 4,
  },
  statusBadgeText: {
    color: colors.text3,
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadgeTextActive: {
    color: colors.accent,
  },
  statusBadgeAbandoned: {
    paddingVertical: 4,
  },
  statusBadgeTextAbandoned: {
    color: colors.text3,
  },
  recordExercises: {
    color: colors.text2,
    fontSize: 13,
  },
});
