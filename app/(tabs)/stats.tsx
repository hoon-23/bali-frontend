import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedBar, AnimatedCell } from "../../components/AnimatedBar";
import { PlanLockCard } from "../../components/PlanLimitSheet";
import { isLimitExceededError } from "../../lib/api/planLimit";
import { ScreenBackground } from "../../components/ScreenBackground";
import {
  IN_PROGRESS_BANNER_RESERVED_HEIGHT,
  SCREEN_HORIZONTAL_MARGIN,
  TAB_BAR_BOTTOM_MARGIN,
  TAB_BAR_HEIGHT,
} from "../../constants/layout";
import { CARD_SHADOW } from "../../constants/shadow";
import { getMonthGrid, toISODate, WEEKDAY_LABELS_MON_FIRST } from "../../lib/date";
import { computeTopMuscleGroups } from "../../lib/analysis/muscleGroups";
import { formatThousands } from "../../lib/format/number";
import { useExerciseMap, formatExerciseName } from "../../hooks/api/useExercises";
import { useLatestInsight } from "../../hooks/api/useLatestInsight";
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

// 배치가 만든 인사이트 중 가장 최근 것 하나만 보여준다 — 없으면(기록 없음/배치 전) 카드를 숨긴다.
function LatestInsightCard() {
  const { data } = useLatestInsight();
  if (!data) return null;
  return (
    <View style={styles.insightCard}>
      <Text style={styles.insightLabel}>{data.periodLabel} 인사이트</Text>
      <Text style={styles.insightText}>{data.text}</Text>
    </View>
  );
}

// 직전 기간이 아주 작으면 증가율이 수백~수천 %로 튀어 실제보다 훨씬 커 보인다 — 이 값 이상이면
// 이 값을 넘으면 숫자를 빼고 "크게 늘었어요"로만 말한다(감소율은 100%를 못 넘으므로 해당 없음).
const LARGE_INCREASE_PERCENT = 100;

function formatChangeText(periodLabel: string, change: number): string {
  // 서버 증감률은 총량이 아니라 "맨몸 기록이 있는 세션의 세션당 평균" 기준이라 문구도 세션당으로 쓴다.
  if (change > LARGE_INCREASE_PERCENT) return `${periodLabel}보다 세션당 크게 늘었어요`;
  return `${periodLabel}보다 세션당 ${Math.abs(Math.round(change))}% ${change >= 0 ? "증가" : "감소"}했어요`;
}

// 맨몸 종목은 무게 볼륨이 0이라 볼륨 집계에 안 잡힌다 — 종목별 총 반복수(세트×반복수)를 따로 보여준다.
function BodyweightRepsSection({
  summary,
  periodLabel,
}: {
  summary: AnalysisSummaryResponse | null | undefined;
  periodLabel: string;
}) {
  const exerciseMap = useExerciseMap();
  const entries = Object.entries(summary?.bodyweightRepsByExercise ?? {})
    .filter(([, reps]) => reps > 0)
    .sort((a, b) => b[1] - a[1]);
  // 해당 기간에 맨몸 운동 기록이 없으면 섹션 전체를 숨긴다.
  if (entries.length === 0) return null;

  const change = summary?.bodyweightRepsChangeFromLastWeekPercent;
  return (
    <View>
      <Text style={styles.sectionTitle}>맨몸 운동 반복수</Text>
      <View style={styles.card}>
        {entries.map(([exerciseId, reps], index) => {
          const exercise = exerciseMap.get(exerciseId);
          return (
            <View key={exerciseId} style={[styles.muscleRow, index > 0 && styles.muscleRowSpacing]}>
              <Text style={styles.muscleLabel}>{exercise ? formatExerciseName(exercise) : "알 수 없는 운동"}</Text>
              <Text style={styles.muscleValue}>{formatThousands(reps)}회</Text>
            </View>
          );
        })}
        {change != null && (
          <Text style={[styles.emptyStateText, styles.muscleRowSpacing]}>
            {formatChangeText(periodLabel, change)}
          </Text>
        )}
      </View>
    </View>
  );
}

// 유산소 시간 — 근육군 집중도·맨몸 반복수와 같은 위계의 섹션. 시간이 0 또는 null이면 섹션 전체를 숨긴다.
function CardioTimeSection({ minutes }: { minutes: number | null }) {
  // 해당 기간의 유산소 시간이 0 또는 null이면 섹션을 표시하지 않는다.
  if (minutes == null || minutes === 0) return null;

  return (
    <View>
      <Text style={styles.sectionTitle}>유산소 시간</Text>
      <View style={styles.card}>
        <View style={styles.totalTimeRow}>
          <Text style={styles.cardTitle}>총 유산소 시간</Text>
          <Text style={styles.totalTimeValue}>{formatHours(minutes)}</Text>
        </View>
      </View>
    </View>
  );
}

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
  return `${formatThousands(Math.floor(totalMinutes / 60))}h ${totalMinutes % 60}m`;
}

function dailyMapByDate(daily: DailyAnalysisEntry[] | undefined): Map<string, DailyAnalysisEntry> {
  const map = new Map<string, DailyAnalysisEntry>();
  daily?.forEach((entry) => map.set(entry.date, entry));
  return map;
}

export default function StatsScreen() {
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<ReportView>(params.view === "monthly" ? "monthly" : "weekly");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const inProgressSessionId = useInProgressSessionId();
  const insets = useSafeAreaInsets();

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
  // 이번 달(offset 0)은 /monthly/current, 과거 달은 /monthly/{monthOf} — 둘 다 summary.volumeByMuscleGroup 포함.
  const monthTotalMinutes =
    monthOffset === 0 ? monthlyCurrent.data?.totalWorkoutMinutes : monthlyPast.data?.summary?.totalWorkoutMinutes;
  const monthSummary = monthOffset === 0 ? monthlyCurrent.data?.summary : monthlyPast.data?.summary;
  const monthPastUnavailable = monthOffset < 0 && monthlyPast.data !== undefined && monthlyPast.data?.summary == null;
  // 월간 인사이트가 무료 플랜 한도로 잠긴 경우(403 MONTHLY_INSIGHTS) — 에러 대신 잠금 UI를 보여준다.
  const monthLocked = isLimitExceededError(monthOffset === 0 ? monthlyCurrent.error : monthlyPast.error);
  const topMuscleGroupsMonth = useMemo(
    () => computeTopMuscleGroups(monthSummary),
    [monthSummary],
  );

  // 이번 주(offset 0)는 /weekly/current, 과거 주는 /weekly/{weekOf} — 둘 다 summary.volumeByMuscleGroup 포함.
  const totalWorkoutMinutes =
    weekOffset === 0 ? weeklyCurrent.data?.totalWorkoutMinutes : weeklyPast.data?.summary?.totalWorkoutMinutes;
  const weekSummary = weekOffset === 0 ? weeklyCurrent.data?.summary : weeklyPast.data?.summary;
  const pastWeekUnavailable = weekOffset < 0 && weeklyPast.data !== undefined && weeklyPast.data?.summary == null;

  // 유산소 시간 — 이번 주는 최상위 cardioMinutes, 과거 주는 summary.cardioTotalMinutes. 구버전 행은 null일 수 있어 0으로 표시.
  const weekCardioMinutes =
    (weekOffset === 0 ? weeklyCurrent.data?.cardioMinutes : weeklyPast.data?.summary?.cardioTotalMinutes) ?? 0;
  const monthCardioMinutes =
    (monthOffset === 0 ? monthlyCurrent.data?.cardioMinutes : monthlyPast.data?.summary?.cardioTotalMinutes) ?? 0;

  const topMuscleGroups = useMemo(() => computeTopMuscleGroups(weekSummary), [weekSummary]);

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
        >
          <View style={styles.header}>
            <Text style={styles.screenTitle}>내 리포트</Text>
            <Pressable
              style={styles.viewToggle}
              onPress={() => setView((prev) => (prev === "weekly" ? "monthly" : "weekly"))}
            >
              <Text style={styles.viewToggleText}>{view === "weekly" ? "주간" : "월간"}</Text>
              <ChevronDown size={14} color="#2DD4BF" />
            </Pressable>
          </View>

          <LatestInsightCard />

          {view === "weekly" ? (
            <>
              <View style={styles.dateNavRow}>
                <Pressable onPress={() => setWeekOffset((offset) => offset - 1)} hitSlop={8}>
                  <ChevronLeft size={18} color="#2DD4BF" />
                </Pressable>
                <Text style={styles.dateRangeText}>{weekRangeLabel}</Text>
                <Pressable
                  onPress={() => setWeekOffset((offset) => Math.min(0, offset + 1))}
                  hitSlop={8}
                  disabled={weekOffset >= 0}
                >
                  <ChevronRight
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
                      <View style={styles.barTrack}>
                        <AnimatedBar
                          direction="vertical"
                          progress={maxBarValue > 0 ? value / maxBarValue : 0}
                          delay={index * 60}
                          style={[
                            styles.bar,
                            {
                              backgroundColor:
                                index === todayIndex ? "#2DD4BF" : "rgba(45, 212, 191, 0.35)",
                            },
                          ]}
                        />
                      </View>
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
                  <AnimatedBar
                    progress={(totalWorkoutMinutes ?? 0) / WEEKLY_TARGET_MINUTES}
                    style={styles.progressFill}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.sectionTitle}>근육군별 집중도</Text>
                <View style={styles.card}>
                  {weekOffset === 0 && weeklyCurrent.isLoading ? (
                    <Text style={styles.emptyStateText}>불러오는 중...</Text>
                  ) : pastWeekUnavailable ? (
                    <Text style={styles.emptyStateText}>이 주는 운동 기록이 없어요.</Text>
                  ) : topMuscleGroups.length === 0 ? (
                    <Text style={styles.emptyStateText}>
                      {weekOffset === 0
                        ? "이번 주 운동 기록이 아직 없어요."
                        : weeklyPast.isLoading
                          ? "불러오는 중..."
                          : "이 주는 근육군 기록이 없어요."}
                    </Text>
                  ) : (
                    topMuscleGroups.map((item, index) => (
                      <View key={item.label} style={[index > 0 && styles.muscleRowSpacing]}>
                        <View style={styles.muscleRow}>
                          <Text style={styles.muscleLabel}>{item.label}</Text>
                          <Text style={styles.muscleValue}>{item.percent}%</Text>
                        </View>
                        <View style={styles.progressTrack}>
                          <AnimatedBar progress={item.percent / 100} style={styles.progressFill} />
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
              <BodyweightRepsSection
                summary={weekSummary}
                periodLabel="지난주"
              />
              <CardioTimeSection minutes={weekCardioMinutes} />

            </>
          ) : (
            <>
              {monthLocked && <PlanLockCard limit="MONTHLY_INSIGHTS" />}
              {!monthLocked && (
              <>
              <View style={styles.summaryRow}>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryLabel}>이번 주 운동일</Text>
                  <Text style={styles.summaryValue}>{me ? `${me.weeklyWorkoutDays}일` : "—"}</Text>
                </View>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryLabel}>총 운동시간</Text>
                  <Text style={styles.summaryValue}>
                    {monthTotalMinutes != null ? formatHours(monthTotalMinutes) : "—"}
                  </Text>
                </View>
              </View>
              </>
              )}

              <View style={styles.card}>
                <View style={styles.calendarHeader}>
                  <Text style={styles.cardTitle}>
                    {monthDisplayDate.getFullYear()}년 {monthDisplayDate.getMonth() + 1}월
                  </Text>
                  <View style={styles.calendarNav}>
                    <Pressable onPress={() => setMonthOffset((offset) => offset - 1)} hitSlop={8}>
                      <ChevronLeft size={18} color="#A0A0A0" />
                    </Pressable>
                    <Pressable
                      onPress={() => setMonthOffset((offset) => Math.min(0, offset + 1))}
                      hitSlop={8}
                      disabled={monthOffset >= 0}
                    >
                      <ChevronRight
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
                      if (day === null) return <View key={dayIndex} style={styles.dayCell} />;
                      return (
                        <AnimatedCell
                          key={dayIndex}
                          index={weekIndex * 7 + dayIndex}
                          style={[styles.dayCell, { backgroundColor: getHeatColor(count) }]}
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

              {!monthLocked && (
              <View>
                <Text style={styles.sectionTitle}>근육군별 집중도</Text>
                <View style={styles.card}>
                  {monthOffset === 0 && monthlyCurrent.isLoading ? (
                    <Text style={styles.emptyStateText}>불러오는 중...</Text>
                  ) : monthPastUnavailable ? (
                    <Text style={styles.emptyStateText}>이 달은 운동 기록이 없어요.</Text>
                  ) : topMuscleGroupsMonth.length === 0 ? (
                    <Text style={styles.emptyStateText}>
                      {monthOffset === 0
                        ? "이번 달 운동 기록이 아직 없어요."
                        : monthlyPast.isLoading
                          ? "불러오는 중..."
                          : "이 달은 근육군 기록이 없어요."}
                    </Text>
                  ) : (
                    topMuscleGroupsMonth.map((item, index) => (
                      <View key={item.label} style={[index > 0 && styles.muscleRowSpacing]}>
                        <View style={styles.muscleRow}>
                          <Text style={styles.muscleLabel}>{item.label}</Text>
                          <Text style={styles.muscleValue}>{item.percent}%</Text>
                        </View>
                        <View style={styles.progressTrack}>
                          <AnimatedBar progress={item.percent / 100} style={styles.progressFill} />
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
              )}
              {!monthLocked && (
                <BodyweightRepsSection
                  summary={monthSummary}
                  periodLabel="지난달"
                />
              )}
              {!monthLocked && <CardioTimeSection minutes={monthCardioMinutes} />}

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
  barTrack: {
    height: 90,
    justifyContent: "flex-end",
  },
  bar: {
    width: 18,
    minHeight: 2,
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
  insightCard: {
    backgroundColor: "#1C1C25",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(45, 212, 191, 0.35)",
    padding: 16,
    gap: 6,
  },
  insightLabel: {
    color: "#2DD4BF",
    fontSize: 12,
    fontWeight: "700",
  },
  insightText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
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
