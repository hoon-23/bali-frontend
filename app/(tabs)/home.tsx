import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { appAlert } from "../../lib/alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN, TAB_BAR_BOTTOM_MARGIN, TAB_BAR_HEIGHT } from "../../constants/layout";
import { MUSCLE_GROUP_IMAGES, MUSCLE_GROUP_LABELS } from "../../constants/muscleGroups";
import { toDisplayMuscleGroup } from "../../constants/exercises";
import { CARD_SHADOW } from "../../constants/shadow";
import { useWorkoutSessionStore } from "../../store/workoutSessionStore";
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

export default function HomeScreen() {
  const router = useRouter();
  const activeSessionId = useWorkoutSessionStore((state) => state.sessionId);

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

  const sessionsDone = weeklyCurrent?.completedSessionsCount ?? 0;
  const sessionsTarget = me?.weeklyGoalSessions ?? 0;
  const sessionsProgress = sessionsTarget > 0 ? sessionsDone / sessionsTarget : 0;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
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
            ) : cardState ? (
              <TodayWorkoutCard
                cardState={cardState}
                exercises={exercises}
                onStart={handleStartWorkout}
                onPreview={(id) => router.push(`/upcoming/${id}`)}
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

type TodayWorkoutCardProps = {
  cardState: Exclude<UpcomingCardState, { kind: "EMPTY" }>;
  exercises: ApiExercise[] | undefined;
  onStart: (sessionId: string) => void;
  onPreview: (sessionId: string) => void;
};

function TodayWorkoutCard({ cardState, exercises, onStart, onPreview }: TodayWorkoutCardProps) {
  if (cardState.kind === "COMPLETED_TODAY") {
    return (
      <View style={{ gap: 12 }}>
        <View style={styles.card}>
          <Text style={styles.suggestedName}>오늘 운동 완료! · {cardState.session.title}</Text>
        </View>
        {cardState.next && (
          <SessionSummaryCard
            session={cardState.next}
            exercises={exercises}
            metaLabel={`다음 운동 · ${toDDayLabel(cardState.next.date)}`}
            actionLabel="미리보기"
            onAction={() => onPreview(cardState.next!.id)}
          />
        )}
      </View>
    );
  }

  const session = cardState.kind === "NEXT_UPCOMING" ? cardState.next : cardState.session;
  const isToday = cardState.kind !== "NEXT_UPCOMING";
  const durationMinutes = estimateSessionDurationMinutes(session.logs);
  const actionLabel = cardState.kind === "IN_PROGRESS" ? "이어하기" : isToday ? "시작" : "미리보기";

  return (
    <SessionSummaryCard
      session={session}
      exercises={exercises}
      metaLabel={isToday ? `${durationMinutes}분` : `다음 운동 · ${toDDayLabel(session.date)}`}
      actionLabel={actionLabel}
      onAction={() => (isToday ? onStart(session.id) : onPreview(session.id))}
    />
  );
}

type SessionSummaryCardProps = {
  session: ApiSession;
  exercises: ApiExercise[] | undefined;
  metaLabel: string;
  actionLabel: string;
  onAction: () => void;
};

function SessionSummaryCard({ session, exercises, metaLabel, actionLabel, onAction }: SessionSummaryCardProps) {
  const firstExerciseId = session.logs[0]?.exerciseId;
  const exercise = exercises?.find((e) => e.id === firstExerciseId);
  const muscleGroup = exercise ? toDisplayMuscleGroup(exercise.muscleGroup) : null;

  return (
    <View style={styles.card}>
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
        <View>
          <Text style={styles.suggestedName}>{session.title}</Text>
          <Text style={styles.suggestedMeta}>{metaLabel}</Text>
        </View>
        <Pressable style={styles.startButton} onPress={onAction}>
          <Text style={styles.startButtonText}>{actionLabel}</Text>
        </Pressable>
      </View>
    </View>
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
  startButton: {
    backgroundColor: "#2DD4BF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  startButtonText: {
    color: "#0B0B0F",
    fontSize: 14,
    fontWeight: "700",
  },
});
