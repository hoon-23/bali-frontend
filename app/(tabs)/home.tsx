import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { appAlert } from "../../lib/alert";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { ScreenBackground } from "../../components/ScreenBackground";
import {
  IN_PROGRESS_BANNER_RESERVED_HEIGHT,
  SCREEN_HORIZONTAL_MARGIN,
  TAB_BAR_BOTTOM_MARGIN,
  TAB_BAR_HEIGHT,
} from "../../constants/layout";
import { MUSCLE_GROUP_IMAGES, MUSCLE_GROUP_LABELS } from "../../constants/muscleGroups";
import { toDisplayMuscleGroup } from "../../constants/exercises";
import { CARD_SHADOW } from "../../constants/shadow";
import { useWorkoutSessionStore } from "../../store/workoutSessionStore";
import { useInProgressSessionId } from "../../hooks/api/useInProgressSession";
import { useMe } from "../../hooks/api/useMe";
import { useWeeklyCurrent } from "../../hooks/api/useWeeklyCurrent";
import { useExercises, ApiExercise } from "../../hooks/api/useExercises";
import { useUpcomingSessions, getTodayISODate } from "../../hooks/api/useUpcomingSessions";
import {
  deriveUpcomingCardState,
  estimateSessionDurationMinutes,
  ApiSession,
  UpcomingCardState,
} from "../../lib/session/sessionDisplay";
import { minutesToDurationText } from "../../lib/format/duration";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TODAY_CARD_GAP = 12; // todayCardList의 카드 사이 간격과 동일한 값 — 배너와의 간격도 이걸로 통일한다.
const RING_SIZE = 88;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ringOffset(progress: number): number {
  const clamped = Math.max(0, Math.min(1, progress));
  return RING_CIRCUMFERENCE * (1 - clamped);
}

function toDDayLabel(dateStr: string): string {
  const diffDays = Math.round(
    (new Date(dateStr).getTime() - new Date(getTodayISODate()).getTime()) / 86400000
  );
  return `D-${diffDays}`;
}

function sessionCardMeta(session: ApiSession): { metaLabel: string; actionLabel: string; muted: boolean } {
  if (session.status === "COMPLETED") {
    return { metaLabel: "오늘 완료", actionLabel: "완료", muted: true };
  }
  return {
    metaLabel: `${estimateSessionDurationMinutes(session.logs)}분`,
    actionLabel: session.status === "IN_PROGRESS" ? "이어하기" : "시작",
    muted: false,
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const activeSessionId = useWorkoutSessionStore((state) => state.sessionId);
  // "운동 진행 중" 배너((tabs)/_layout.tsx)가 떠 있으면 그만큼 하단 여백을 더 줘서
  // 마지막 카드가 배너에 가려 탭이 안 먹히는 문제를 막는다.
  const inProgressSessionId = useInProgressSessionId();

  const { data: me, isError: meError, refetch: refetchMe } = useMe();
  const { data: weeklyCurrent, isError: weeklyCurrentError, refetch: refetchWeeklyCurrent } = useWeeklyCurrent();
  const { data: exercises } = useExercises();
  const {
    data: sessions,
    isLoading: sessionsLoading,
    isError: sessionsError,
    refetch: refetchSessions,
  } = useUpcomingSessions();

  const goToMonthlyReport = () => {
    router.push({ pathname: "/stats", params: { view: "monthly" } });
  };

  const cardState: UpcomingCardState | null = sessions
    ? deriveUpcomingCardState(sessions, getTodayISODate())
    : null;

  const handleStartWorkout = (sessionId: string) => {
    const target = { pathname: `/workout/${sessionId}` } as const;
    if (activeSessionId && activeSessionId !== sessionId) {
      appAlert(
        "진행 중인 운동이 있습니다",
        "새로 시작하면 기존 기록이 사라집니다.",
        [
          { text: "취소", style: "cancel" },
          { text: "새로 시작", style: "destructive", onPress: () => router.push(target) },
        ],
      );
      return;
    }
    router.push(target);
  };

  const handleSessionAction = (session: ApiSession) => {
    if (session.status === "COMPLETED") {
      router.push(`/records/${session.id}`);
      return;
    }
    handleStartWorkout(session.id);
  };

  const sessionsDone = weeklyCurrent?.completedSessionsCount ?? 0;
  const sessionsTarget = me?.weeklyGoalSessions ?? 0;
  const sessionsProgress = sessionsTarget > 0 ? sessionsDone / sessionsTarget : 0;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            inProgressSessionId && {
              // 배너 위치(_layout.tsx)는 insets.bottom을 더해서 계산되는데
              // 이 화면은 SafeAreaView edges=["top"]이라 insets.bottom이 반영 안 돼 있었음 —
              // 그만큼 배너와 겹쳐 보였던 원인. 여기서도 같은 insets.bottom을 더해 맞춘다.
              paddingBottom:
                insets.bottom +
                TAB_BAR_BOTTOM_MARGIN +
                TAB_BAR_HEIGHT +
                IN_PROGRESS_BANNER_RESERVED_HEIGHT +
                TODAY_CARD_GAP,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {(meError || weeklyCurrentError) && (
            <View style={styles.card}>
              <Text style={styles.legendText}>불러오지 못했어요</Text>
              <Pressable
                style={styles.startButton}
                onPress={() => {
                  refetchMe();
                  refetchWeeklyCurrent();
                }}
              >
                <Text style={styles.startButtonText}>다시 시도</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.header}>
            <View>
              <Text style={styles.greetingSub}>안녕하세요</Text>
              <Text style={styles.greeting}>{me?.nickname ?? "—"}님</Text>
            </View>
            <Pressable style={styles.bellButton} hitSlop={8}>
              <Ionicons name="notifications" size={18} color="#FBBF24" />
            </Pressable>
          </View>

          <Pressable style={styles.card} onPress={goToMonthlyReport}>
            <Text style={styles.cardTitle}>이번 주 진행률</Text>
            <View style={styles.progressRow}>
              <View style={styles.ringWrap}>
                <Svg width={RING_SIZE} height={RING_SIZE}>
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth={RING_STROKE}
                    fill="none"
                  />
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    stroke="#A78BFA"
                    strokeWidth={RING_STROKE}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={ringOffset(sessionsProgress)}
                    rotation={-90}
                    origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                  />
                </Svg>
              </View>
              <View style={styles.progressLegend}>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: "#A78BFA" }]} />
                  <Text style={styles.legendText}>
                    세션 {sessionsDone} / {sessionsTarget}
                  </Text>
                </View>
                <View style={styles.legendRow}>
                  <Text style={styles.legendText}>
                    운동시간 {weeklyCurrent ? minutesToDurationText(weeklyCurrent.totalWorkoutMinutes) : "—"}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>

          <View style={styles.statsRow}>
            <StatTile
              label="근력운동"
              value={weeklyCurrent ? minutesToDurationText(weeklyCurrent.strengthMinutes) : "—"}
            />
            <StatTile
              label="유산소"
              value={weeklyCurrent ? minutesToDurationText(weeklyCurrent.cardioMinutes) : "—"}
            />
            <StatTile
              label="연속일"
              value={me ? `${me.consecutiveDays}일` : "—"}
              onPress={goToMonthlyReport}
            />
          </View>

          <View>
            <Text style={styles.sectionTitle}>오늘의 운동</Text>
            {sessionsError ? (
              <View style={styles.card}>
                <Text style={styles.legendText}>불러오지 못했어요</Text>
                <Pressable style={styles.startButton} onPress={() => refetchSessions()}>
                  <Text style={styles.startButtonText}>다시 시도</Text>
                </Pressable>
              </View>
            ) : cardState?.kind === "EMPTY" ? (
              <View style={styles.card}>
                <Text style={styles.suggestedName}>예정된 운동이 없어요</Text>
                <Pressable style={styles.startButton} onPress={() => router.push("/routines")}>
                  <Text style={styles.startButtonText}>루틴 시작하기</Text>
                </Pressable>
              </View>
            ) : cardState?.kind === "TODAY" ? (
              <View style={styles.todayCardList}>
                <TodaySessionCards
                  sessions={cardState.sessions}
                  exercises={exercises}
                  onAction={handleSessionAction}
                  onExpand={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                />
                {cardState.sessions.every((s) => s.status === "COMPLETED") && cardState.next && (
                  <SessionSummaryCard
                    session={cardState.next}
                    exercises={exercises}
                    metaLabel={`다음 운동 · ${toDDayLabel(cardState.next.date)}`}
                    actionLabel="미리보기"
                    onAction={() => router.push(`/upcoming/${cardState.next!.id}`)}
                  />
                )}
              </View>
            ) : cardState?.kind === "NEXT_UPCOMING" ? (
              <SessionSummaryCard
                session={cardState.next}
                exercises={exercises}
                metaLabel={`다음 운동 · ${toDDayLabel(cardState.next.date)}`}
                actionLabel="미리보기"
                onAction={() => router.push(`/upcoming/${cardState.next.id}`)}
              />
            ) : (
              <View style={styles.card}>
                <Text style={styles.legendText}>{sessionsLoading ? "불러오는 중..." : ""}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

type TodaySessionCardsProps = {
  sessions: ApiSession[];
  exercises: ApiExercise[] | undefined;
  onAction: (session: ApiSession) => void;
  // 압축 행이 펼쳐질 때 새로 드러난 사진+버튼이 탭바/배너에 가려지지 않게 스크롤을 끝까지 내린다.
  onExpand: () => void;
};

// 우선순위가 가장 높은 세션(정렬은 deriveUpcomingCardState가 이미 해둠)만 사진 카드로,
// 나머지는 SecondarySessionRow로 압축해서 보여준다.
function TodaySessionCards({ sessions, exercises, onAction, onExpand }: TodaySessionCardsProps) {
  const [primarySession, ...secondarySessions] = sessions;
  const primaryMeta = sessionCardMeta(primarySession);

  return (
    <>
      <SessionSummaryCard
        session={primarySession}
        exercises={exercises}
        metaLabel={primaryMeta.metaLabel}
        actionLabel={primaryMeta.actionLabel}
        muted={primaryMeta.muted}
        onAction={() => onAction(primarySession)}
      />
      {secondarySessions.map((session) => {
        const meta = sessionCardMeta(session);
        return (
          <SecondarySessionRow
            key={session.id}
            session={session}
            exercises={exercises}
            metaLabel={meta.metaLabel}
            actionLabel={meta.actionLabel}
            muted={meta.muted}
            onAction={() => onAction(session)}
            onExpand={onExpand}
          />
        );
      })}
    </>
  );
}

type SessionSummaryCardProps = {
  session: ApiSession;
  exercises: ApiExercise[] | undefined;
  metaLabel: string;
  actionLabel: string;
  onAction: () => void;
  // 이미 끝난 세션 카드 — "이어하기"처럼 계속할 수 있다는 인상을 주지 않게
  // 버튼을 액션형(민트)이 아닌 안내형(회색)으로 보여준다.
  muted?: boolean;
};

function SessionSummaryCard({ session, exercises, metaLabel, actionLabel, onAction, muted }: SessionSummaryCardProps) {
  const firstExerciseId = session.logs[0]?.exerciseId;
  const exercise = exercises?.find((e) => e.id === firstExerciseId);
  const muscleGroup = exercise ? toDisplayMuscleGroup(exercise.muscleGroup) : null;

  return (
    <Pressable style={styles.card} onPress={onAction}>
      <View style={styles.photoWrap}>
        {muscleGroup && (
          <Image source={MUSCLE_GROUP_IMAGES[muscleGroup]} style={styles.photo} resizeMode="cover" />
        )}
        {muscleGroup && (
          <View style={styles.photoBadge}>
            <Text style={styles.photoBadgeText}>{MUSCLE_GROUP_LABELS[muscleGroup]}</Text>
          </View>
        )}
      </View>
      <View style={styles.suggestedRow}>
        <View style={styles.suggestedTitleGroup}>
          <Text style={styles.suggestedName}>{session.title}</Text>
          <Text style={styles.suggestedMeta}>{metaLabel}</Text>
        </View>
        <View style={styles.cardIndicator}>
          <Text style={[styles.cardIndicatorText, muted && styles.cardIndicatorTextMuted]}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={16} color={muted ? "#6B6B6B" : "#2DD4BF"} />
        </View>
      </View>
    </Pressable>
  );
}

type SecondarySessionRowProps = SessionSummaryCardProps & {
  // 펼쳐졌을 때(접힐 때는 X) 호출 — 새로 드러난 사진+버튼이 탭바/배너에 가리지 않게 스크롤한다.
  onExpand: () => void;
};

// 오늘 세션이 여러 개일 때 첫 번째(가장 우선순위 높은)만 사진 카드로 보여주고
// 나머지는 압축된 행으로 두었다가, 탭하면 그 자리에서 사진+버튼이 펼쳐진다 —
// 큰 사진 카드가 여러 개 연달아 쌓이면 같은 카드가 중복 렌더링된 것처럼 보여서 생긴 개선.
function SecondarySessionRow({ session, exercises, metaLabel, actionLabel, onAction, muted, onExpand }: SecondarySessionRowProps) {
  const [expanded, setExpanded] = useState(false);
  const firstExerciseId = session.logs[0]?.exerciseId;
  const exercise = exercises?.find((e) => e.id === firstExerciseId);
  const muscleGroup = exercise ? toDisplayMuscleGroup(exercise.muscleGroup) : null;

  useEffect(() => {
    if (!expanded) return;
    // 레이아웃이 실제로 반영된 뒤(다음 프레임) 스크롤해야 새 콘텐츠 높이가 반영된다.
    const id = requestAnimationFrame(() => onExpand());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  return (
    <Pressable style={styles.secondaryCard} onPress={toggle}>
      <View style={styles.secondaryHeaderRow}>
        <View style={styles.secondaryTitleGroup}>
          <Text style={styles.suggestedName}>{session.title}</Text>
          <Text style={styles.suggestedMeta}>{metaLabel}</Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#6B6B6B" />
      </View>
      {expanded && (
        <View style={styles.secondaryExpanded}>
          <View style={styles.photoWrap}>
            {muscleGroup && (
              <Image source={MUSCLE_GROUP_IMAGES[muscleGroup]} style={styles.photo} resizeMode="cover" />
            )}
            {muscleGroup && (
              <View style={styles.photoBadge}>
                <Text style={styles.photoBadgeText}>{MUSCLE_GROUP_LABELS[muscleGroup]}</Text>
              </View>
            )}
          </View>
          <Pressable
            style={[styles.startButton, styles.secondaryActionButton, muted && styles.startButtonMuted]}
            onPress={onAction}
          >
            <Text style={[styles.startButtonText, muted && styles.startButtonTextMuted]}>{actionLabel}</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

type StatTileProps = {
  value: string;
  label: string;
  onPress?: () => void;
};

function StatTile({ value, label, onPress }: StatTileProps) {
  return (
    <Pressable style={styles.statTile} onPress={onPress} disabled={!onPress}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </Pressable>
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
    gap: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greetingSub: {
    color: "#A0A0A0",
    fontSize: 13,
  },
  greeting: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 2,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#16161C",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#1C1C25",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 16,
    gap: 16,
    ...CARD_SHADOW,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
  },
  progressLegend: {
    flex: 1,
    gap: 10,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: "#D0D0D0",
    fontSize: 13,
    flexShrink: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statTile: {
    flex: 1,
    backgroundColor: "#1C1C25",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
    ...CARD_SHADOW,
  },
  statLabel: {
    color: "#A0A0A0",
    fontSize: 12,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  todayCardList: {
    gap: TODAY_CARD_GAP,
  },
  secondaryCard: {
    backgroundColor: "#1C1C25",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 16,
    ...CARD_SHADOW,
  },
  secondaryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryTitleGroup: {
    flex: 1,
  },
  secondaryExpanded: {
    marginTop: 16,
    gap: 16,
  },
  secondaryActionButton: {
    alignSelf: "flex-start",
  },
  photoWrap: {
    borderRadius: 12,
    overflow: "hidden",
    height: 140,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(11, 11, 15, 0.65)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  photoBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  suggestedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  suggestedName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  suggestedMeta: {
    color: "#A0A0A0",
    fontSize: 12,
    marginTop: 2,
  },
  suggestedTitleGroup: {
    flex: 1,
  },
  cardIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  cardIndicatorText: {
    color: "#2DD4BF",
    fontSize: 13,
    fontWeight: "600",
  },
  cardIndicatorTextMuted: {
    color: "#6B6B6B",
  },
  startButton: {
    backgroundColor: "#2DD4BF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  startButtonMuted: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  startButtonText: {
    color: "#0B0B0F",
    fontSize: 14,
    fontWeight: "700",
  },
  startButtonTextMuted: {
    color: "#A0A0A0",
  },
});
