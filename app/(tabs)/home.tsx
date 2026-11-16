import { AnimatedBar } from "../../components/AnimatedBar";
import { Bell, ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { appAlert } from "../../lib/alert";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../../components/AppText";
import { ScreenBackground } from "../../components/ScreenBackground";
import { Reveal } from "../../components/ui/Reveal";
import { BigNumber } from "../../components/ui/BigNumber";
import { PressableScale } from "../../components/ui/PressableScale";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { QuietButton } from "../../components/ui/QuietButton";
import { Divider, Section } from "../../components/ui/Section";
import { Skeleton } from "../../components/Skeleton";
import {
  IN_PROGRESS_BANNER_RESERVED_HEIGHT,
  SCREEN_HORIZONTAL_MARGIN,
  TAB_BAR_BOTTOM_MARGIN,
  TAB_BAR_HEIGHT,
} from "../../constants/layout";
import { colors, radius, space, type } from "../../constants/theme";
import { useRoutineEntry } from "../../hooks/useRoutineEntry";
import { useWorkoutSessionStore } from "../../store/workoutSessionStore";
import { useInProgressSessionId } from "../../hooks/api/useInProgressSession";
import { useUnreadNotificationCount } from "../../hooks/api/useNotificationInbox";
import { useMe } from "../../hooks/api/useMe";
import { useLifetimeStats } from "../../hooks/api/useAnalysis";
import { useWeeklyCurrent } from "../../hooks/api/useWeeklyCurrent";
import { computeTopMuscleGroups } from "../../lib/analysis/muscleGroups";
import { useUpcomingSessions, getTodayISODate } from "../../hooks/api/useUpcomingSessions";
import { usePatchSession } from "../../hooks/api/useSessions";
import {
  deriveUpcomingCardState,
  estimateSessionDurationMinutes,
  ApiSession,
  UpcomingCardState,
} from "../../lib/session/sessionDisplay";
import { minutesToDurationText } from "../../lib/format/duration";
import { formatThousands } from "../../lib/format/number";


// 기록이 없을 때 보여줄 흐린 막대 3줄의 길이 — 실제 수치가 아니라 모양만 잡는 값이다.
const GHOST_BAR_WIDTHS = ["45%", "30%", "18%"] as const;

function toDDayLabel(dateStr: string): string {
  const diffDays = Math.round(
    (new Date(dateStr).getTime() - new Date(getTodayISODate()).getTime()) / 86400000
  );
  return `D-${diffDays}`;
}

function sessionCardMeta(session: ApiSession): { metaLabel: string; actionLabel: string; muted: boolean } {
  if (session.status === "COMPLETED") {
    return { metaLabel: "오늘 완료", actionLabel: "기록 보기", muted: true };
  }
  return {
    metaLabel: `${estimateSessionDurationMinutes(session.logs)}분`,
    actionLabel: session.status === "IN_PROGRESS" ? "이어하기" : "운동 시작",
    muted: false,
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const { noRoutines, openRoutines } = useRoutineEntry();
  const insets = useSafeAreaInsets();
  const activeSessionId = useWorkoutSessionStore((state) => state.sessionId);
  // "운동 진행 중" 배너((tabs)/_layout.tsx)가 떠 있으면 그만큼 하단 여백을 더 줘서
  // 마지막 카드가 배너에 가려 탭이 안 먹히는 문제를 막는다.
  const inProgressSessionId = useInProgressSessionId();

  const patchSession = usePatchSession();
  // isPending은 캐시에 데이터가 아직 없고 에러도 아닐 때만 true — 이때만 스켈레톤을 보인다.
  // 백그라운드 재조회 중에는 기존 값이 그대로 남아 깜빡이지 않는다.
  const { data: me, isPending: mePending, isError: meError, refetch: refetchMe } = useMe();
  const unreadCount = useUnreadNotificationCount();
  const { data: lifetime, isPending: lifetimePending } = useLifetimeStats();
  // 리포트 주간 보기(이번 주)와 같은 데이터·같은 계산으로 맞춘다.
  // 월간 분석 API는 무료 플랜에서 403(MONTHLY_INSIGHTS)이라 월간 인사이트는 리포트 탭에만 둔다.
  const { data: weeklyCurrent, isPending: weeklyPending } = useWeeklyCurrent();
  const topMuscleGroupsWeek = computeTopMuscleGroups(weeklyCurrent?.summary);
  const {
    data: sessions,
    isPending: sessionsPending,
    isError: sessionsError,
    refetch: refetchSessions,
  } = useUpcomingSessions();

  const goToMonthlyReport = () => {
    router.push({ pathname: "/stats", params: { view: "monthly" } });
  };

  const cardState: UpcomingCardState | null = sessions
    ? deriveUpcomingCardState(sessions, getTodayISODate())
    : null;

  // 홈 카드의 "시작"이 SCHEDULED 세션을 IN_PROGRESS로 바꾸지 않고 그냥 화면만 이동하던 버그 —
  // 예정된 운동 상세/루틴 상세의 "시작하기"와 달리 상태 전환이 빠져 있어서, 시작 후 닫으면
  // 서버엔 계속 SCHEDULED로 남아 "운동 진행 중" 배너/이어하기가 뜨지 않았다.
  const handleStartWorkout = (sessionId: string, needsStatusPatch: boolean) => {
    const target = { pathname: `/workout/${sessionId}` } as const;
    const navigate = async () => {
      if (needsStatusPatch) {
        try {
          await patchSession.mutateAsync({ sessionId, status: "IN_PROGRESS" });
        } catch {
          appAlert("운동을 시작하지 못했어요. 다시 시도해주세요.");
          return;
        }
      }
      router.push(target);
    };
    if (activeSessionId && activeSessionId !== sessionId) {
      appAlert(
        "진행 중인 운동이 있습니다",
        "새로 시작하면 기존 기록이 사라집니다.",
        [
          { text: "취소", style: "cancel" },
          { text: "새로 시작", style: "destructive", onPress: navigate },
        ],
      );
      return;
    }
    navigate();
  };

  const handleSessionAction = (session: ApiSession) => {
    if (session.status === "COMPLETED") {
      router.push(`/records/${session.id}`);
      return;
    }
    handleStartWorkout(session.id, session.status === "SCHEDULED");
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              // 탭바 위치(_layout.tsx)는 insets.bottom을 더해서 계산되는데
              // 이 화면은 SafeAreaView edges=["top"]이라 insets.bottom이 반영 안 돼 있었음 —
              // 그만큼 하단 여백이 부족해서 마지막 항목이 탭바와 겹쳐 보였던 원인.
              // 여기서도 같은 insets.bottom을 더해 맞춘다.
              paddingBottom:
                insets.bottom +
                TAB_BAR_BOTTOM_MARGIN +
                TAB_BAR_HEIGHT +
                (inProgressSessionId ? IN_PROGRESS_BANNER_RESERVED_HEIGHT + space.s12 : space.s24),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* 인사 줄 — 작게 둔다. 앱을 열었을 때 가장 먼저 보여야 하는 것은 아래 "오늘의 운동"이다. */}
          <View>
            <View style={styles.header}>
              <PressableScale
                style={styles.identity}
                disabled={!me?.level}
                onPress={() => router.push("/profile")}
                accessibilityRole="button"
                accessibilityLabel="프로필의 경험치 보기"
                hitSlop={8}
              >
                {mePending ? (
                  <Skeleton width={120} height={14} style={styles.identitySkeleton} />
                ) : (
                  <AppText style={styles.identityText} numberOfLines={1}>
                    {me?.nickname ?? "—"} 님{me?.level ? ` · Lv.${me.level.level}` : ""}
                  </AppText>
                )}
              </PressableScale>
              <PressableScale
                style={styles.bellButton}
                hitSlop={8}
                onPress={() => router.push("/notifications")}
                accessibilityRole="button"
                accessibilityLabel={unreadCount > 0 ? `알림, ${unreadCount}개 안 읽음` : "알림"}
              >
                <Bell size={20} color={colors.text2} />
                {unreadCount > 0 && (
                  <View style={styles.bellBadge}>
                    <AppText style={styles.bellBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</AppText>
                  </View>
                )}
              </PressableScale>
            </View>
            {/* 레벨 값이 늦게 와도 자리는 미리 잡혀 있어 아래가 밀리지 않는다. */}
            <View style={styles.xpTrack}>
              {me?.level && (
                <AnimatedBar
                  progress={me.level.xpForNextLevel > 0 ? me.level.currentXp / me.level.xpForNextLevel : 0}
                  style={styles.xpFill}
                />
              )}
            </View>
          </View>

          {meError && (
            <View style={styles.errorRow}>
              <AppText style={styles.errorText}>내 정보를 불러오지 못했어요</AppText>
              <QuietButton variant="text" title="다시 시도" onPress={() => refetchMe()} />
            </View>
          )}

          <Reveal index={1}>
          <Section label="오늘의 운동" style={styles.todaySection}>
            {sessionsError ? (
              <View style={styles.todayBody}>
                <View style={styles.todayEmptyTitleWrap}>
                  <AppText style={styles.todayEmptyTitle}>불러오지 못했어요</AppText>
                </View>
                <QuietButton title="다시 시도" onPress={() => refetchSessions()} />
              </View>
            ) : cardState?.kind === "EMPTY" ? (
              <View style={styles.todayBody}>
                <View style={styles.todayEmptyTitleWrap}>
                  <AppText style={styles.todayEmptyTitle}>예정된 운동이 없어요</AppText>
                </View>
                <PrimaryButton title={noRoutines ? "첫 루틴 만들기" : "루틴 시작하기"} onPress={openRoutines} />
              </View>
            ) : cardState?.kind === "TODAY" ? (
              <>
                <TodayHero session={cardState.sessions[0]} onAction={() => handleSessionAction(cardState.sessions[0])} />
                {(cardState.sessions.length > 1 || cardState.next) && (
                  <View style={styles.sessionRows}>
                    {cardState.sessions.slice(1).map((session) => (
                      <SessionRow
                        key={session.id}
                        title={session.title}
                        // 누르면 바로 시작/이어하기가 되므로 무엇이 일어나는지 행에 적어 둔다.
                        meta={`${sessionCardMeta(session).metaLabel} · ${sessionCardMeta(session).actionLabel}`}
                        onPress={() => handleSessionAction(session)}
                      />
                    ))}
                    {cardState.next && (
                      <SessionRow
                        title={cardState.next.title}
                        meta={`다음 운동 · ${toDDayLabel(cardState.next.date)}`}
                        onPress={() => router.push(`/upcoming/${cardState.next!.id}`)}
                      />
                    )}
                  </View>
                )}
              </>
            ) : cardState?.kind === "NEXT_UPCOMING" ? (
              <View style={styles.todayBody}>
                <View>
                  <AppText style={styles.todayTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                    {cardState.next.title}
                  </AppText>
                  <AppText style={styles.todayMeta}>
                    다음 운동 · {toDDayLabel(cardState.next.date)} · {sessionVolumeText(cardState.next)}
                  </AppText>
                </View>
                <QuietButton title="미리보기" onPress={() => router.push(`/upcoming/${cardState.next.id}`)} />
              </View>
            ) : (
              // 로딩 중 — 실제 내용(제목 + 메타 + 버튼)과 같은 높이를 잡아 데이터가 와도 아래가 밀리지 않는다.
              <View style={styles.todayBody}>
                <View style={styles.todaySkeletonLines}>
                  {sessionsPending && <Skeleton width="60%" height={32} />}
                  {sessionsPending && <Skeleton width={120} height={15} />}
                </View>
                <View style={styles.todaySkeletonButton}>{sessionsPending && <Skeleton height={52} radius={radius.control} />}</View>
              </View>
            )}
          </Section>
          </Reveal>

          <Divider />

          <Reveal index={2}>
          <View style={styles.weekRow}>
            <PressableScale onPress={goToMonthlyReport} accessibilityRole="button" accessibilityLabel="월간 리포트 보기">
              <AppText style={styles.weekLabel}>이번 주</AppText>
              {mePending ? (
                <Skeleton width={110} height={36} style={styles.weekSkeleton} />
              ) : (
                <BigNumber size="display" value={me ? me.weeklyWorkoutDays : "—"} unit="일 운동" />
              )}
            </PressableScale>
            <View style={styles.lifetime}>
              {lifetimePending ? (
                <Skeleton width={64} height={30} />
              ) : (
                <>
                  <AppText style={styles.lifetimeText}>
                    누적 {lifetime ? `${formatThousands(lifetime.totalWorkoutDays)}일` : "—"}
                  </AppText>
                  <AppText style={styles.lifetimeText}>
                    {lifetime ? minutesToDurationText(lifetime.totalWorkoutMinutes) : "—"}
                  </AppText>
                </>
              )}
            </View>
          </View>
          </Reveal>

          <Reveal index={3}>
          <Section label="이번 주 근육군별 집중도">
            {topMuscleGroupsWeek.length > 0 ? (
              <View style={styles.muscleBars}>
                {topMuscleGroupsWeek.map((item, index) => (
                  // 1위만 흰색으로 또렷하게, 나머지는 회색 — 색이 아니라 밝기 차이로 순위를 보여준다.
                  <View key={item.label}>
                    <View style={styles.muscleBarHeader}>
                      <AppText style={[styles.muscleBarLabel, index === 0 && styles.muscleBarLabelTop]}>
                        {item.label}
                      </AppText>
                      <AppText style={styles.muscleBarPercent}>{item.percent}%</AppText>
                    </View>
                    <View style={styles.muscleBarTrack}>
                      <AnimatedBar
                        progress={item.percent / 100}
                        style={[styles.muscleBarFill, index === 0 && styles.muscleBarFillTop]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : weeklyPending ? (
              // 로딩 중에 "기록이 없어요"가 잘못 보이지 않게 막대 모양으로 자리만 잡는다.
              <View style={styles.muscleBars}>
                <Skeleton width="100%" height={26} />
                <Skeleton width="100%" height={26} />
                <Skeleton width="100%" height={26} />
              </View>
            ) : (
              // 기록이 없을 때는 가짜 막대를 그리지 않는다 — 실제 집계처럼 읽혀서 헷갈린다.
              // 기록이 없을 때는 이름 없는 흐린 막대만 둔다 — "이런 그래프가 생긴다"는 모양은 예고하되,
              // 부위 이름과 수치를 붙이면 실제 집계처럼 읽혀서 뺐다.
              <>
                <AppText style={styles.muscleEmpty}>운동을 기록하면 부위별 비중이 여기에 나와요</AppText>
                <View style={styles.ghostBars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  {GHOST_BAR_WIDTHS.map((width) => (
                    <View key={width} style={styles.muscleBarTrack}>
                      <View style={[styles.ghostBarFill, { width }]} />
                    </View>
                  ))}
                </View>
              </>
            )}
          </Section>
          </Reveal>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

// "5종목 · 15세트" — 세트 목표가 없는(유산소만 있는) 세션은 종목 수만 보여준다.
function sessionVolumeText(session: ApiSession): string {
  const totalSets = session.logs.reduce((sum, log) => sum + (log.targetSets ?? 0), 0);
  const exercises = `${session.logs.length}종목`;
  return totalSets > 0 ? `${exercises} · ${totalSets}세트` : exercises;
}

type TodayHeroProps = {
  session: ApiSession;
  onAction: () => void;
};

// 오늘 할 운동 하나를 크게 보여준다 — 앱을 열면 가장 먼저 보이는 것이 "오늘 무엇을 하는가"와 시작 버튼이다.
function TodayHero({ session, onAction }: TodayHeroProps) {
  const { metaLabel, actionLabel, muted } = sessionCardMeta(session);
  return (
    <View style={styles.todayBody}>
      <View>
        <AppText style={styles.todayTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {session.title}
        </AppText>
        <AppText style={styles.todayMeta}>
          {sessionVolumeText(session)} · {metaLabel}
        </AppText>
      </View>
      {/* 이미 끝난 세션은 "계속할 수 있다"는 인상을 주지 않게 민트 주 버튼 대신 조용한 버튼으로 보여준다. */}
      {muted ? (
        <QuietButton title={actionLabel} onPress={onAction} />
      ) : (
        <PrimaryButton title={actionLabel} onPress={onAction} />
      )}
    </View>
  );
}

type SessionRowProps = {
  title: string;
  meta: string;
  onPress: () => void;
};

// 오늘의 두 번째 이후 세션, 다음 예정 운동을 한 줄로 보여준다.
function SessionRow({ title, meta, onPress }: SessionRowProps) {
  return (
    <PressableScale style={styles.sessionRow} onPress={onPress} accessibilityRole="button">
      <AppText style={styles.sessionRowTitle} numberOfLines={1}>
        {title}
      </AppText>
      <AppText style={styles.sessionRowMeta}>{meta}</AppText>
      <ChevronRight size={16} color={colors.text3} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingTop: space.s8,
    gap: space.s24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 40,
  },
  identity: {
    flexShrink: 1,
    justifyContent: "center",
    height: 40,
  },
  identityText: {
    ...type.label,
    color: colors.text2,
  },
  identitySkeleton: {
    marginVertical: 1,
  },
  bellButton: {
    width: 40,
    height: 40,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  // 벨 오른쪽 위에 겹쳐 놓는 안 읽은 알림 개수 — 버튼 크기는 그대로라 주변 레이아웃이 밀리지 않는다.
  bellBadge: {
    position: "absolute",
    top: 2,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: radius.pill,
    paddingHorizontal: 5,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeText: {
    color: colors.onAccent,
    fontSize: 10,
    fontWeight: "800",
  },
  xpTrack: {
    height: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
    overflow: "hidden",
  },
  xpFill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorText: {
    ...type.label,
    fontWeight: "400",
    color: colors.text2,
  },
  todaySection: {
    marginTop: space.s8,
  },
  todayBody: {
    gap: space.s20,
  },
  todayTitle: {
    ...type.title,
    color: colors.text,
    letterSpacing: -0.6,
    lineHeight: 40,
  },
  todayMeta: {
    ...type.body,
    color: colors.text2,
    marginTop: space.s4,
  },
  // 로딩·오늘 운동 있음과 같은 높이(제목 40 + 메타 22)를 잡아, 데이터가 와도 아래가 밀리지 않는다.
  todayEmptyTitleWrap: {
    height: 62,
    justifyContent: "center",
  },
  todayEmptyTitle: {
    ...type.heading,
    color: colors.text,
  },
  // 제목(40) + 메타(4 + 18) 높이에 맞춘 로딩 자리.
  todaySkeletonLines: {
    height: 62,
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  todaySkeletonButton: {
    height: 52,
  },
  sessionRows: {
    marginTop: space.s12,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    gap: space.s8,
  },
  sessionRowTitle: {
    ...type.body,
    color: colors.text,
    flex: 1,
  },
  sessionRowMeta: {
    ...type.label,
    fontWeight: "400",
    color: colors.text3,
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  weekLabel: {
    ...type.meta,
    color: colors.text3,
    marginBottom: space.s4,
  },
  // display 숫자 한 줄 높이(44)에 맞춘다.
  weekSkeleton: {
    marginVertical: 4,
  },
  lifetime: {
    alignItems: "flex-end",
    gap: 2,
    paddingBottom: 6,
  },
  lifetimeText: {
    ...type.meta,
    color: colors.text3,
    fontVariant: ["tabular-nums"],
  },
  muscleEmpty: {
    ...type.body,
    color: colors.text2,
    marginTop: space.s4,
  },
  ghostBars: {
    gap: space.s20,
    marginTop: space.s12,
  },
  ghostBarFill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.track,
  },
  muscleBars: {
    gap: space.s12,
    marginTop: space.s8,
  },
  muscleBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  muscleBarLabel: {
    ...type.label,
    fontWeight: "400",
    color: colors.text2,
  },
  muscleBarLabelTop: {
    color: colors.text,
    fontWeight: "600",
  },
  muscleBarPercent: {
    ...type.label,
    fontWeight: "400",
    color: colors.text2,
    fontVariant: ["tabular-nums"],
  },
  muscleBarTrack: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
    overflow: "hidden",
    marginTop: 6,
  },
  muscleBarFill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  muscleBarFillTop: {
    backgroundColor: colors.text,
  },
});
