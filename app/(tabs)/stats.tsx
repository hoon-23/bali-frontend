import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import {
  IN_PROGRESS_BANNER_RESERVED_HEIGHT,
  SCREEN_HORIZONTAL_MARGIN,
  TAB_BAR_BOTTOM_MARGIN,
  TAB_BAR_HEIGHT,
} from "../../constants/layout";
import { CARD_SHADOW } from "../../constants/shadow";
import { MUSCLE_GROUP_KOREAN } from "../../constants/exercises";
import { getMonthGrid, toISODate, WEEKDAY_LABELS_MON_FIRST } from "../../lib/date";
import { useInProgressSessionId } from "../../hooks/api/useInProgressSession";
import { useMe } from "../../hooks/api/useMe";
import { useWeeklyCurrent } from "../../hooks/api/useWeeklyCurrent";
import {
  AnalysisSummaryResponse,
  DailyAnalysisEntry,
  useDailyAnalysis,
  useMonthlyByDate,
  useMonthlyCurrent,
  useWeeklyByDate,
} from "../../hooks/api/useAnalysis";

type ReportView = "weekly" | "monthly";

const DAILY_TARGET_MINUTES = 60;
const WEEKLY_TARGET_MINUTES = 480; // 8h — 백엔드에 사용자 목표 개념이 없어 고정 표시값

function addDaysISODate(baseISODate: string, deltaDays: number): string {
  const date = new Date(`${baseISODate}T00:00:00`);
  date.setDate(date.getDate() + deltaDays);
  return toISODate(date);
}

// weekOffset(0=이번 주, -1=지난 주 ...) 기준 그 주 월요일 날짜.
function getMondayISODate(offset: number): string {
  const now = new Date();
  const mondayOfThisWeek = (now.getDay() + 6) % 7; // 0 = 월요일
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOfThisWeek + offset * 7);
  return toISODate(monday);
}

function getWeekRangeLabel(weekOf: string): string {
  const monday = new Date(`${weekOf}T00:00:00`);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${monday.getMonth() + 1}월 ${monday.getDate()}일 - ${sunday.getMonth() + 1}월 ${sunday.getDate()}일`;
}

function getHeatColor(count: number): string {
  if (count <= 0) return "rgba(45, 212, 191, 0.08)";
  if (count <= 2) return "rgba(45, 212, 191, 0.3)";
  if (count <= 5) return "rgba(45, 212, 191, 0.55)";
  return "#2DD4BF";
}

function formatHours(totalMinutes: number): string {
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

function dailyMapByDate(daily: DailyAnalysisEntry[] | undefined): Map<string, DailyAnalysisEntry> {
  const map = new Map<string, DailyAnalysisEntry>();
  daily?.forEach((entry) => map.set(entry.date, entry));
  return map;
}

type TopMuscleGroup = { label: string; percent: number; volume: number };

function computeTopMuscleGroups(
  volumeByMuscleGroup: AnalysisSummaryResponse["volumeByMuscleGroup"] | undefined
): TopMuscleGroup[] {
  if (!volumeByMuscleGroup) return [];
  const entries = Object.entries(volumeByMuscleGroup).filter(([, volume]) => (volume ?? 0) > 0) as [
    string,
    number,
  ][];
  const total = entries.reduce((sum, [, volume]) => sum + volume, 0);
  if (total <= 0) return [];
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([group, volume]) => ({
      label: MUSCLE_GROUP_KOREAN[group as keyof typeof MUSCLE_GROUP_KOREAN] ?? group,
      percent: Math.round((volume / total) * 100),
      volume: Math.round(volume),
    }));
}

export default function StatsScreen() {
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<ReportView>(params.view === "monthly" ? "monthly" : "weekly");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const inProgressSessionId = useInProgressSessionId();

  useEffect(() => {
    if (params.view === "monthly") {
      setView("monthly");
    }
  }, [params.view]);

  const { data: me } = useMe();

  const weekOf = useMemo(() => getMondayISODate(weekOffset), [weekOffset]);
  const weekSunday = useMemo(() => addDaysISODate(weekOf, 6), [weekOf]);
  const weekRangeLabel = useMemo(() => getWeekRangeLabel(weekOf), [weekOf]);

  const weeklyCurrent = useWeeklyCurrent();
  const weeklyPast = useWeeklyByDate(weekOffset < 0 ? weekOf : null);
  const dailyThisWeek = useDailyAnalysis(weekOf, weekSunday, view === "weekly");

  const monthDisplayDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const monthWeeks = useMemo(
    () => getMonthGrid(monthDisplayDate.getFullYear(), monthDisplayDate.getMonth()),
    [monthDisplayDate],
  );

  const monthStart = useMemo(() => toISODate(new Date(monthDisplayDate.getFullYear(), monthDisplayDate.getMonth(), 1)), [monthDisplayDate]);
  const monthEnd = useMemo(() => toISODate(new Date(monthDisplayDate.getFullYear(), monthDisplayDate.getMonth() + 1, 0)), [monthDisplayDate]);
  const dailyThisMonth = useDailyAnalysis(monthStart, monthEnd, view === "monthly");

  const monthlyCurrent = useMonthlyCurrent();
  const monthlyPast = useMonthlyByDate(monthOffset < 0 ? monthStart : null);
  // 이번 달(offset 0)은 /monthly/current(집계 진행 중, 근육군별 볼륨 없음), 과거 달은 /monthly/{monthOf}
  const monthTotalMinutes =
    monthOffset === 0 ? monthlyCurrent.data?.totalWorkoutMinutes : monthlyPast.data?.summary?.totalWorkoutMinutes;
  const monthVolumeByMuscleGroup = monthOffset < 0 ? monthlyPast.data?.summary?.volumeByMuscleGroup : undefined;
  const monthPastUnavailable = monthOffset < 0 && monthlyPast.data !== undefined && monthlyPast.data?.summary == null;
  const topMuscleGroupsMonth = useMemo(
    () => computeTopMuscleGroups(monthVolumeByMuscleGroup),
    [monthVolumeByMuscleGroup],
  );

  // 이번 주(offset 0)는 /weekly/current(집계 진행 중, 근육군별 볼륨 없음), 과거 주는 /weekly/{weekOf}
  const totalWorkoutMinutes =
    weekOffset === 0 ? weeklyCurrent.data?.totalWorkoutMinutes : weeklyPast.data?.summary?.totalWorkoutMinutes;
  const volumeByMuscleGroup = weekOffset < 0 ? weeklyPast.data?.summary?.volumeByMuscleGroup : undefined;
  const pastWeekUnavailable = weekOffset < 0 && weeklyPast.data !== undefined && weeklyPast.data?.summary == null;

  const topMuscleGroups = useMemo(() => computeTopMuscleGroups(volumeByMuscleGroup), [volumeByMuscleGroup]);

  const weekDailyByDate = useMemo(() => dailyMapByDate(dailyThisWeek.data), [dailyThisWeek.data]);
  const weekBarMinutes = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekDailyByDate.get(addDaysISODate(weekOf, i))?.totalMinutes ?? 0),
    [weekDailyByDate, weekOf],
  );
  const todayIndex = weekOffset === 0 ? (new Date().getDay() + 6) % 7 : -1;
  const maxBarValue = Math.max(...weekBarMinutes, DAILY_TARGET_MINUTES);

  const monthDailyByDate = useMemo(() => dailyMapByDate(dailyThisMonth.data), [dailyThisMonth.data]);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            inProgressSessionId && { paddingBottom: styles.scrollContent.paddingBottom + IN_PROGRESS_BANNER_RESERVED_HEIGHT },
          ]}
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
                <Pressable
                  onPress={() => setWeekOffset((offset) => Math.min(0, offset + 1))}
                  hitSlop={8}
                  disabled={weekOffset >= 0}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={weekOffset >= 0 ? "#3A3A42" : "#2DD4BF"}
                  />
                </Pressable>
              </View>

              <View style={styles.dayPillRow}>
                {WEEKDAY_LABELS_MON_FIRST.map((label, index) => {
                  const active = weekBarMinutes[index] > 0;
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
                  {weekBarMinutes.map((value, index) => (
                    <View key={index} style={styles.barColumn}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: Math.max(2, 90 * (value / maxBarValue)),
                            backgroundColor:
                              index === todayIndex ? "#2DD4BF" : "rgba(45, 212, 191, 0.35)",
                          },
                        ]}
                      />
                      <Text style={styles.barLabel}>{WEEKDAY_LABELS_MON_FIRST[index]}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.totalTimeRow}>
                  <Text style={styles.cardTitle}>총 운동시간</Text>
                  <Text style={styles.totalTimeValue}>
                    {totalWorkoutMinutes != null ? formatHours(totalWorkoutMinutes) : "—"}
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, ((totalWorkoutMinutes ?? 0) / WEEKLY_TARGET_MINUTES) * 100)}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.sectionTitle}>근육군별 집중도</Text>
                <View style={styles.card}>
                  {weekOffset === 0 ? (
                    <Text style={styles.emptyStateText}>이번 주 데이터는 아직 집계 중이에요.</Text>
                  ) : pastWeekUnavailable ? (
                    <Text style={styles.emptyStateText}>이 주는 운동 기록이 없어요.</Text>
                  ) : topMuscleGroups.length === 0 ? (
                    <Text style={styles.emptyStateText}>불러오는 중...</Text>
                  ) : (
                    topMuscleGroups.map((item, index) => (
                      <View key={item.label} style={[index > 0 && styles.muscleRowSpacing]}>
                        <View style={styles.muscleRow}>
                          <Text style={styles.muscleLabel}>{item.label}</Text>
                          <Text style={styles.muscleValue}>
                            {item.percent}% · {item.volume}kg
                          </Text>
                        </View>
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${item.percent}%` }]} />
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.summaryRow}>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryLabel}>연속일</Text>
                  <Text style={styles.summaryValue}>{me ? `${me.consecutiveDays}일` : "—"}</Text>
                </View>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryLabel}>총 운동시간</Text>
                  <Text style={styles.summaryValue}>
                    {monthTotalMinutes != null ? formatHours(monthTotalMinutes) : "—"}
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
                    <Pressable
                      onPress={() => setMonthOffset((offset) => Math.min(0, offset + 1))}
                      hitSlop={8}
                      disabled={monthOffset >= 0}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={monthOffset >= 0 ? "#3A3A42" : "#A0A0A0"}
                      />
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
                    {week.map((day, dayIndex) => {
                      const dateStr =
                        day !== null
                          ? toISODate(new Date(monthDisplayDate.getFullYear(), monthDisplayDate.getMonth(), day))
                          : null;
                      const count = dateStr ? monthDailyByDate.get(dateStr)?.completedSets ?? 0 : 0;
                      return (
                        <View
                          key={dayIndex}
                          style={[styles.dayCell, day !== null && { backgroundColor: getHeatColor(count) }]}
                        />
                      );
                    })}
                  </View>
                ))}

                <View style={styles.legendRow}>
                  {["0세트", "1-2세트", "3-5세트", "6세트+"].map((label, index) => (
                    <View key={label} style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendSwatch,
                          { backgroundColor: getHeatColor(index === 0 ? 0 : index === 1 ? 1 : index === 2 ? 3 : 6) },
                        ]}
                      />
                      <Text style={styles.legendText}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View>
                <Text style={styles.sectionTitle}>근육군별 집중도</Text>
                <View style={styles.card}>
                  {monthOffset === 0 ? (
                    <Text style={styles.emptyStateText}>이번 달 데이터는 아직 집계 중이에요.</Text>
                  ) : monthPastUnavailable ? (
                    <Text style={styles.emptyStateText}>이 달은 운동 기록이 없어요.</Text>
                  ) : topMuscleGroupsMonth.length === 0 ? (
                    <Text style={styles.emptyStateText}>불러오는 중...</Text>
                  ) : (
                    topMuscleGroupsMonth.map((item, index) => (
                      <View key={item.label} style={[index > 0 && styles.muscleRowSpacing]}>
                        <View style={styles.muscleRow}>
                          <Text style={styles.muscleLabel}>{item.label}</Text>
                          <Text style={styles.muscleValue}>
                            {item.percent}% · {item.volume}kg
                          </Text>
                        </View>
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${item.percent}%` }]} />
                        </View>
                      </View>
                    ))
                  )}
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
  emptyStateText: {
    color: "#6B6B6B",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 8,
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
