import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN, TAB_BAR_BOTTOM_MARGIN, TAB_BAR_HEIGHT } from "../../constants/layout";
import { useWorkoutSessionStore } from "../../store/workoutSessionStore";

const USER_NAME = "민준";
const STREAK_DAYS = 12;
const TOTAL_SESSIONS = 24;
const AVG_SESSIONS_PER_WEEK = 3.5;
const LEVEL = 5;

const RECENT_RECORDS = [
  { id: "1", name: "벤치프레스", date: "오늘", summary: "4세트 · 60kg" },
  { id: "2", name: "스쿼트", date: "어제", summary: "4세트 · 80kg" },
  { id: "3", name: "데드리프트", date: "2일 전", summary: "3세트 · 100kg" },
];

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

// Deterministic mock workout count per day-of-month, so the heatmap doesn't reshuffle on re-render
function getMockCountForDay(day: number): number {
  return (day * 3 + 1) % 4;
}

function getHeatColor(count: number): string {
  if (count <= 0) return "rgba(45, 212, 191, 0.08)";
  if (count === 1) return "rgba(45, 212, 191, 0.3)";
  if (count === 2) return "rgba(45, 212, 191, 0.55)";
  return "#2DD4BF";
}

function getMonthGrid(year: number, month: number): (number | null)[][] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Monday

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export default function HomeScreen() {
  const router = useRouter();
  const activeSessionId = useWorkoutSessionStore((state) => state.sessionId);
  const [monthOffset, setMonthOffset] = useState(0);

  const displayDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const weeks = useMemo(
    () => getMonthGrid(displayDate.getFullYear(), displayDate.getMonth()),
    [displayDate],
  );

  const handleStartWorkout = () => {
    if (activeSessionId) {
      Alert.alert(
        "진행 중인 운동이 있습니다",
        "새로 시작하면 기존 기록이 사라집니다.",
        [
          { text: "취소", style: "cancel" },
          {
            text: "새로 시작",
            style: "destructive",
            onPress: () => router.push(`/workout/${Date.now()}`),
          },
        ],
      );
      return;
    }
    router.push(`/workout/${Date.now()}`);
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
              <Text style={styles.greeting}>좋은 아침이에요, {USER_NAME}님</Text>
              <Text style={styles.greetingSub}>오늘도 한 단계 성장해요</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{USER_NAME[0]}</Text>
            </View>
          </View>

          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {STREAK_DAYS}일 연속 운동 중</Text>
          </View>

          <Pressable style={styles.ctaCard} onPress={handleStartWorkout}>
            <LinearGradient
              colors={["#2DD4BF", "#1F5F5B"]}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View>
              <Text style={styles.ctaTitle}>운동 시작하기</Text>
              <Text style={styles.ctaSubtitle}>오늘의 운동을 기록하세요</Text>
            </View>
            <View style={styles.ctaIconWrap}>
              <Ionicons name="barbell" size={24} color="#0B0B0F" />
            </View>
          </Pressable>

          <View style={styles.statsRow}>
            <StatTile value={String(TOTAL_SESSIONS)} label="총 운동 기록" />
            <StatTile value={AVG_SESSIONS_PER_WEEK.toFixed(1)} label="평균 운동(회/주)" />
            <StatTile value={`Lv.${LEVEL}`} label="레벨" />
          </View>

          <View style={styles.card}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>
                {displayDate.getFullYear()}년 {displayDate.getMonth() + 1}월
              </Text>
              <View style={styles.calendarNav}>
                <Pressable onPress={() => setMonthOffset((offset) => offset - 1)} hitSlop={8}>
                  <Ionicons name="chevron-back" size={18} color="#A0A0A0" />
                </Pressable>
                <Pressable onPress={() => setMonthOffset((offset) => offset + 1)} hitSlop={8}>
                  <Ionicons name="chevron-forward" size={18} color="#A0A0A0" />
                </Pressable>
              </View>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAY_LABELS.map((label) => (
                <Text key={label} style={styles.weekdayText}>
                  {label}
                </Text>
              ))}
            </View>

            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekRow}>
                {week.map((day, dayIndex) => (
                  <View
                    key={dayIndex}
                    style={[
                      styles.dayCell,
                      day !== null && { backgroundColor: getHeatColor(getMockCountForDay(day)) },
                    ]}
                  />
                ))}
              </View>
            ))}

            <View style={styles.legendRow}>
              {["0회", "1회", "2회", "3회+"].map((label, index) => (
                <View key={label} style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: getHeatColor(index) }]} />
                  <Text style={styles.legendText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>최근 운동 기록</Text>
              <Text style={styles.sectionLink}>전체 보기</Text>
            </View>
            <View style={styles.card}>
              {RECENT_RECORDS.map((record, index) => (
                <View
                  key={record.id}
                  style={[styles.recordRow, index > 0 && styles.recordRowDivider]}
                >
                  <View style={styles.recordIcon}>
                    <Ionicons name="barbell" size={16} color="#2DD4BF" />
                  </View>
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordName}>{record.name}</Text>
                    <Text style={styles.recordDate}>{record.date}</Text>
                  </View>
                  <Text style={styles.recordSummary}>{record.summary}</Text>
                </View>
              ))}
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
};

function StatTile({ value, label }: StatTileProps) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  greeting: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  greetingSub: {
    color: "#A0A0A0",
    fontSize: 13,
    marginTop: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(45, 212, 191, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#2DD4BF",
    fontSize: 16,
    fontWeight: "700",
  },
  streakBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(45, 212, 191, 0.12)",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  streakText: {
    color: "#2DD4BF",
    fontSize: 13,
    fontWeight: "600",
  },
  ctaCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
  },
  ctaTitle: {
    color: "#0B0B0F",
    fontSize: 18,
    fontWeight: "700",
  },
  ctaSubtitle: {
    color: "rgba(11, 11, 15, 0.7)",
    fontSize: 13,
    marginTop: 4,
  },
  ctaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(11, 11, 15, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statTile: {
    flex: 1,
    backgroundColor: "#16161C",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  statLabel: {
    color: "#A0A0A0",
    fontSize: 11,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#16161C",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 16,
    gap: 8,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  calendarTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  calendarNav: {
    flexDirection: "row",
    gap: 16,
  },
  weekRow: {
    flexDirection: "row",
    gap: 4,
  },
  weekdayText: {
    flex: 1,
    color: "#6B6B6B",
    fontSize: 11,
    textAlign: "center",
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 6,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    color: "#6B6B6B",
    fontSize: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  sectionLink: {
    color: "#2DD4BF",
    fontSize: 13,
    fontWeight: "600",
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  recordRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  recordIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(45, 212, 191, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  recordInfo: {
    flex: 1,
  },
  recordName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  recordDate: {
    color: "#6B6B6B",
    fontSize: 12,
    marginTop: 2,
  },
  recordSummary: {
    color: "#A0A0A0",
    fontSize: 13,
  },
});
