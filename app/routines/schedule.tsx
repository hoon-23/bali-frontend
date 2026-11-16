import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { colors } from "../../constants/theme";
import { PressableScale } from "../../components/ui/PressableScale";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppAlertModal } from "../../components/AppAlertModal";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { appAlert } from "../../lib/alert";
import { getMonthGrid, toISODate, WEEKDAY_LABELS_MON_FIRST } from "../../lib/date";
import { useCreateSession } from "../../hooks/api/useSessions";
import { getTodayISODate } from "../../hooks/api/useUpcomingSessions";

// "예정된 운동" 목록이 오늘부터 30일 범위만 조회하므로(useUpcomingSessions), 예약 가능 범위도 맞춘다
const SCHEDULABLE_DAYS = 30;

export default function ScheduleRoutineScreen() {
  const { templateId, name } = useLocalSearchParams<{ templateId: string; name: string }>();
  const router = useRouter();
  const createSession = useCreateSession();
  const todayISODate = useMemo(() => getTodayISODate(), []);
  const maxISODate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + SCHEDULABLE_DAYS);
    return toISODate(date);
  }, []);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedISODate, setSelectedISODate] = useState(todayISODate);
  const [saving, setSaving] = useState(false);

  const monthDisplayDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);
  const monthWeeks = useMemo(
    () => getMonthGrid(monthDisplayDate.getFullYear(), monthDisplayDate.getMonth()),
    [monthDisplayDate]
  );
  const canGoToNextMonth = useMemo(() => {
    const firstOfNextMonth = new Date(monthDisplayDate.getFullYear(), monthDisplayDate.getMonth() + 1, 1);
    return toISODate(firstOfNextMonth) <= maxISODate;
  }, [monthDisplayDate, maxISODate]);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const session = await createSession.mutateAsync({ date: selectedISODate, templateId });
      router.replace(`/upcoming/${session.id}`);
    } catch {
      appAlert("예약하지 못했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <PressableScale style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <X size={20} color={colors.text} />
          </PressableScale>
          <Text style={styles.headerTitle}>날짜 예약</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <Text style={styles.routineName}>{name}</Text>
          <Text style={styles.hint}>운동할 날짜를 선택해주세요</Text>

          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>
                {monthDisplayDate.getFullYear()}년 {monthDisplayDate.getMonth() + 1}월
              </Text>
              <View style={styles.calendarNav}>
                <PressableScale
                  onPress={() => setMonthOffset((offset) => offset - 1)}
                  hitSlop={8}
                  disabled={monthOffset <= 0}
                >
                  <ChevronLeft
                    size={18}
                    color={monthOffset <= 0 ? "#3A3A42" : "#A0A0A0"}
                  />
                </PressableScale>
                <PressableScale
                  onPress={() => setMonthOffset((offset) => offset + 1)}
                  hitSlop={8}
                  disabled={!canGoToNextMonth}
                >
                  <ChevronRight
                    size={18}
                    color={canGoToNextMonth ? "#A0A0A0" : "#3A3A42"}
                  />
                </PressableScale>
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
                  if (day === null) {
                    return <View key={dayIndex} style={styles.dayCell} />;
                  }
                  const dateStr = toISODate(
                    new Date(monthDisplayDate.getFullYear(), monthDisplayDate.getMonth(), day)
                  );
                  const disabled = dateStr < todayISODate || dateStr > maxISODate;
                  const active = dateStr === selectedISODate;
                  return (
                    <PressableScale
                      key={dayIndex}
                      style={styles.dayCell}
                      disabled={disabled}
                      onPress={() => setSelectedISODate(dateStr)}
                    >
                      <View style={[styles.dayCircle, active && styles.dayCircleActive]}>
                        <Text
                          style={[
                            styles.dayText,
                            disabled && styles.dayTextDisabled,
                            active && styles.dayTextActive,
                          ]}
                        >
                          {day}
                        </Text>
                      </View>
                    </PressableScale>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        <PressableScale style={styles.confirmButton} onPress={handleConfirm} disabled={saving}>
          <Text style={styles.confirmButtonText}>{saving ? "예약하는 중..." : "예약하기"}</Text>
        </PressableScale>
      </SafeAreaView>
      {/* 이 화면은 presentation:"modal"로 뜨는 네이티브 모달이라, app/_layout.tsx의 전역
          AppAlertModal이 뒤로 깔린다 — 같은 화면 안에 하나 더 마운트해서 위로 뜨게 한다. */}
      <AppAlertModal />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    gap: 16,
    flex: 1,
  },
  routineName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  hint: {
    color: colors.text2,
    fontSize: 13,
  },
  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  calendarTitle: {
    color: colors.text,
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
    color: colors.text3,
    fontSize: 11,
    textAlign: "center",
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircle: {
    width: "78%",
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleActive: {
    backgroundColor: colors.accent,
  },
  dayText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  dayTextDisabled: {
    color: colors.track,
  },
  dayTextActive: {
    color: colors.onAccent,
  },
  confirmButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginHorizontal: SCREEN_HORIZONTAL_MARGIN,
    marginBottom: 12,
  },
  confirmButtonText: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: "700",
  },
});
