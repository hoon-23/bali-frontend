import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN, TAB_BAR_BOTTOM_MARGIN, TAB_BAR_HEIGHT } from "../../constants/layout";
import { CARD_SHADOW } from "../../constants/shadow";

type ReportView = "weekly" | "monthly";

const STREAK_DAYS = 12;
const WORKOUT_MINUTES = 392; // 6h 32m
const WORKOUT_TARGET_MINUTES = 480; // 8h

const WEEKDAY_LABELS_SUN_FIRST = ["일", "월", "화", "수", "목", "금", "토"];
const DAILY_TARGET_MINUTES = 60;
const WEEK_ACTIVITY_MINUTES = [30, 45, 70, 40, 55, 65, 35]; // Sun..Sat
const HIGHLIGHTED_DAY_INDEX = 2; // Tue, matches the PPT's "today" marker
const ACTIVE_PILL_INDICES = [1, 4, 5]; // Mon, Thu, Fri

const MUSCLE_FOCUS = [
  { label: "CHEST", percent: 62, sets: 42 },
  { label: "BACK", percent: 71, sets: 48 },
  { label: "LEGS", percent: 82, sets: 55 },
];

const WEEKDAY_LABELS_MON_FIRST = ["월", "화", "수", "목", "금", "토", "일"];

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

function getWeekRangeLabel(offset: number): string {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${monday.getMonth() + 1}월 ${monday.getDate()}일 - ${sunday.getMonth() + 1}월 ${sunday.getDate()}일`;
}

export default function StatsScreen() {
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<ReportView>(params.view === "monthly" ? "monthly" : "weekly");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    if (params.view === "monthly") {
      setView("monthly");
    }
  }, [params.view]);

  const weekRangeLabel = useMemo(() => getWeekRangeLabel(weekOffset), [weekOffset]);

  const monthDisplayDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const monthWeeks = useMemo(
    () => getMonthGrid(monthDisplayDate.getFullYear(), monthDisplayDate.getMonth()),
    [monthDisplayDate],
  );

  const maxBarValue = Math.max(...WEEK_ACTIVITY_MINUTES, DAILY_TARGET_MINUTES);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.screenTitle}>내 리포트</Text>
            <Pressable
              style={styles.viewToggle}
              onPress={() => setView((prev) => (prev === "weekly" ? "monthly" : "weekly"))}
            >
              <Text style={styles.viewToggleText}>{view === "weekly" ? "주간" : "월간"}</Text>
              <Ionicons name="chevron-down" size={14} color="#2DD4BF" />
            </Pressable>
          </View>

          {view === "weekly" ? (
            <>
              <View style={styles.dateNavRow}>
                <Pressable onPress={() => setWeekOffset((offset) => offset - 1)} hitSlop={8}>
                  <Ionicons name="chevron-back" size={18} color="#2DD4BF" />
                </Pressable>
                <Text style={styles.dateRangeText}>{weekRangeLabel}</Text>
                <Pressable onPress={() => setWeekOffset((offset) => offset + 1)} hitSlop={8}>
                  <Ionicons name="chevron-forward" size={18} color="#2DD4BF" />
                </Pressable>
              </View>

              <View style={styles.dayPillRow}>
                {WEEKDAY_LABELS_SUN_FIRST.map((label, index) => {
                  const active = ACTIVE_PILL_INDICES.includes(index);
                  return (
                    <View key={label} style={[styles.dayPill, active && styles.dayPillActive]}>
                      <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.card}>
                <View style={styles.activityHeader}>
                  <View>
                    <Text style={styles.cardTitle}>주간 활동</Text>
                    <Text style={styles.cardSubtitle}>활동 분</Text>
                  </View>
                  <View style={styles.targetBadge}>
                    <Text style={styles.targetBadgeLabel}>목표</Text>
                    <Text style={styles.targetBadgeValue}>{DAILY_TARGET_MINUTES}분/일</Text>
                  </View>
                </View>

                <View style={styles.barChart}>
                  {WEEK_ACTIVITY_MINUTES.map((value, index) => (
                    <View key={index} style={styles.barColumn}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: 90 * (value / maxBarValue),
                            backgroundColor:
                              index === HIGHLIGHTED_DAY_INDEX
                                ? "#2DD4BF"
                                : "rgba(45, 212, 191, 0.35)",
                          },
                        ]}
                      />
                      <Text style={styles.barLabel}>{WEEKDAY_LABELS_SUN_FIRST[index]}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.totalTimeRow}>
                  <Text style={styles.cardTitle}>총 운동시간</Text>
                  <Text style={styles.totalTimeValue}>
                    {Math.floor(WORKOUT_MINUTES / 60)}h {WORKOUT_MINUTES % 60}m
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(100, (WORKOUT_MINUTES / WORKOUT_TARGET_MINUTES) * 100)}%` },
                    ]}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.sectionTitle}>근육군별 집중도</Text>
                <View style={styles.card}>
                  {MUSCLE_FOCUS.map((item, index) => (
                    <View key={item.label} style={[index > 0 && styles.muscleRowSpacing]}>
                      <View style={styles.muscleRow}>
                        <Text style={styles.muscleLabel}>{item.label}</Text>
                        <Text style={styles.muscleValue}>
                          {item.percent}% · {item.sets}세트
                        </Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${item.percent}%` }]} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.summaryRow}>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryLabel}>연속일</Text>
                  <Text style={styles.summaryValue}>{STREAK_DAYS}일</Text>
                </View>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryLabel}>총 운동시간</Text>
                  <Text style={styles.summaryValue}>
                    {Math.floor(WORKOUT_MINUTES / 60)}h {WORKOUT_MINUTES % 60}m
                  </Text>
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.calendarHeader}>
                  <Text style={styles.cardTitle}>
                    {monthDisplayDate.getFullYear()}년 {monthDisplayDate.getMonth() + 1}월
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
                  {WEEKDAY_LABELS_MON_FIRST.map((label) => (
                    <Text key={label} style={styles.weekdayText}>
                      {label}
                    </Text>
                  ))}
                </View>

                {monthWeeks.map((week, weekIndex) => (
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
            </>
          )}
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
    gap: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  screenTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
  viewToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1C1C25",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  viewToggleText: {
    color: "#2DD4BF",
    fontSize: 13,
    fontWeight: "600",
  },
  dateNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  dateRangeText: {
    color: "#A0A0A0",
    fontSize: 13,
  },
  dayPillRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayPill: {
    width: 40,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayPillActive: {
    backgroundColor: "rgba(45, 212, 191, 0.15)",
  },
  dayPillText: {
    color: "#6B6B6B",
    fontSize: 13,
    fontWeight: "600",
  },
  dayPillTextActive: {
    color: "#2DD4BF",
  },
  card: {
    backgroundColor: "#1C1C25",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 16,
    gap: 12,
    ...CARD_SHADOW,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: "#6B6B6B",
    fontSize: 11,
    marginTop: 2,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  targetBadge: {
    alignItems: "flex-end",
  },
  targetBadgeLabel: {
    color: "#6B6B6B",
    fontSize: 11,
  },
  targetBadgeValue: {
    color: "#2DD4BF",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  barChart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 110,
  },
  barColumn: {
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  bar: {
    width: 18,
    borderRadius: 6,
  },
  barLabel: {
    color: "#6B6B6B",
    fontSize: 10,
  },
  totalTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalTimeValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#2DD4BF",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  muscleRowSpacing: {
    marginTop: 16,
  },
  muscleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  muscleLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  muscleValue: {
    color: "#2DD4BF",
    fontSize: 12,
    fontWeight: "600",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  summaryTile: {
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
  summaryLabel: {
    color: "#A0A0A0",
    fontSize: 12,
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
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
});
