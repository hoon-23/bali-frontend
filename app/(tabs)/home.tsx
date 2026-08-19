import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN, TAB_BAR_BOTTOM_MARGIN, TAB_BAR_HEIGHT } from "../../constants/layout";
import { MUSCLE_GROUP_IMAGES, MUSCLE_GROUP_LABELS, MuscleGroup } from "../../constants/muscleGroups";
import { CARD_SHADOW } from "../../constants/shadow";
import { useWorkoutSessionStore } from "../../store/workoutSessionStore";

const USER_NAME = "지훈";

const WORKOUT_MINUTES = 392; // 6h 32m
const WORKOUT_TARGET_MINUTES = 480; // 8h
const SESSIONS_DONE = 5;
const SESSIONS_TARGET = 6;

const STRENGTH_TIME = "4h20m";
const CARDIO_TIME = "2h12m";
const STREAK_DAYS = 12;

const SUGGESTED_WORKOUT: {
  name: string;
  level: string;
  duration: string;
  muscleGroup: MuscleGroup;
  templateId: string;
} = {
  name: "전신 운동",
  level: "초급",
  duration: "30분",
  muscleGroup: "chest",
  templateId: "t4",
};

const RING_SIZE = 88;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ringOffset(progress: number): number {
  const clamped = Math.max(0, Math.min(1, progress));
  return RING_CIRCUMFERENCE * (1 - clamped);
}

export default function HomeScreen() {
  const router = useRouter();
  const activeSessionId = useWorkoutSessionStore((state) => state.sessionId);

  const goToMonthlyReport = () => {
    router.push({ pathname: "/stats", params: { view: "monthly" } });
  };

  const handleStartWorkout = () => {
    const target = {
      pathname: `/workout/${Date.now()}`,
      params: { templateId: SUGGESTED_WORKOUT.templateId },
    } as const;

    if (activeSessionId) {
      Alert.alert(
        "진행 중인 운동이 있습니다",
        "새로 시작하면 기존 기록이 사라집니다.",
        [
          { text: "취소", style: "cancel" },
          {
            text: "새로 시작",
            style: "destructive",
            onPress: () => router.push(target),
          },
        ],
      );
      return;
    }
    router.push(target);
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.greetingSub}>안녕하세요</Text>
              <Text style={styles.greeting}>{USER_NAME}님</Text>
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
                    stroke="#2DD4BF"
                    strokeWidth={RING_STROKE}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={ringOffset(WORKOUT_MINUTES / WORKOUT_TARGET_MINUTES)}
                    rotation={-90}
                    origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                  />
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS - RING_STROKE - 4}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth={RING_STROKE}
                    fill="none"
                  />
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS - RING_STROKE - 4}
                    stroke="#A78BFA"
                    strokeWidth={RING_STROKE}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={2 * Math.PI * (RING_RADIUS - RING_STROKE - 4)}
                    strokeDashoffset={
                      2 * Math.PI * (RING_RADIUS - RING_STROKE - 4) *
                      (1 - SESSIONS_DONE / SESSIONS_TARGET)
                    }
                    rotation={-90}
                    origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                  />
                </Svg>
              </View>
              <View style={styles.progressLegend}>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: "#2DD4BF" }]} />
                  <Text style={styles.legendText}>
                    운동시간 {Math.floor(WORKOUT_MINUTES / 60)}h{WORKOUT_MINUTES % 60}m /{" "}
                    {WORKOUT_TARGET_MINUTES / 60}h
                  </Text>
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: "#A78BFA" }]} />
                  <Text style={styles.legendText}>
                    세션 {SESSIONS_DONE} / {SESSIONS_TARGET}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>

          <View style={styles.statsRow}>
            <StatTile label="근력운동" value={STRENGTH_TIME} />
            <StatTile label="유산소" value={CARDIO_TIME} />
            <StatTile label="연속일" value={`${STREAK_DAYS}일`} onPress={goToMonthlyReport} />
          </View>

          <View>
            <Text style={styles.sectionTitle}>오늘의 운동</Text>
            <View style={styles.card}>
              <View style={styles.photoWrap}>
                <Image
                  source={MUSCLE_GROUP_IMAGES[SUGGESTED_WORKOUT.muscleGroup]}
                  style={styles.photo}
                  resizeMode="cover"
                />
                <View style={styles.photoBadge}>
                  <Text style={styles.photoBadgeText}>
                    {MUSCLE_GROUP_LABELS[SUGGESTED_WORKOUT.muscleGroup]}
                  </Text>
                </View>
              </View>

              <View style={styles.suggestedRow}>
                <View>
                  <Text style={styles.suggestedName}>{SUGGESTED_WORKOUT.name}</Text>
                  <Text style={styles.suggestedMeta}>
                    {SUGGESTED_WORKOUT.level} · {SUGGESTED_WORKOUT.duration}
                  </Text>
                </View>
                <Pressable style={styles.startButton} onPress={handleStartWorkout}>
                  <Text style={styles.startButtonText}>시작</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
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
