import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { colors, radius, space, type } from "../../constants/theme";
import { PressableScale } from "../../components/ui/PressableScale";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "../../components/AppText";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppAlertModal } from "../../components/AppAlertModal";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN, TAB_BAR_BOTTOM_MARGIN } from "../../constants/layout";
import { appAlert } from "../../lib/alert";
import { getMonthGrid, toISODate, WEEKDAY_LABELS_MON_FIRST } from "../../lib/date";
import { useCreateSession } from "../../hooks/api/useSessions";
import { getTodayISODate } from "../../hooks/api/useUpcomingSessions";

// "예정된 운동" 목록이 오늘부터 30일 범위만 조회하므로(useUpcomingSessions), 예약 가능 범위도 맞춘다
const SCHEDULABLE_DAYS = 30;

export default function ScheduleRoutineScreen() {
  const { templateId, name } = useLocalSearchParams<{ templateId: string; name: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
          <AppText style={styles.headerTitle}>날짜 예약</AppText>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <AppText style={styles.routineName} numberOfLines={1}>{name}</AppText>
          <AppText style={styles.hint}>운동할 날짜를 선택해주세요</AppText>

          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <AppText style={styles.calendarTitle}>
                {monthDisplayDate.getFullYear()}년 {monthDisplayDate.getMonth() + 1}월
              </AppText>
              <View style={styles.calendarNav}>
                <PressableScale
                  onPress={() => setMonthOffset((offset) => offset - 1)}
                  hitSlop={8}
                  disabled={monthOffset <= 0}
                >
                  <ChevronLeft
                    size={18}
                    color={monthOffset <= 0 ? colors.track : colors.text2}
                  />
                </PressableScale>
                <PressableScale
                  onPress={() => setMonthOffset((offset) => offset + 1)}
                  hitSlop={8}
                  disabled={!canGoToNextMonth}
                >
                  <ChevronRight
                    size={18}
                    color={canGoToNextMonth ? colors.text2 : colors.track}
                  />
                </PressableScale>
              </View>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAY_LABELS_MON_FIRST.map((label) => (
                <AppText key={label} style={styles.weekdayText}>
                  {label}
                </AppText>
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
                        <AppText
                          style={[
                            styles.dayText,
                            disabled && styles.dayTextDisabled,
                            active && styles.dayTextActive,
                          ]}
                        >
                          {day}
                        </AppText>
                      </View>
                    </PressableScale>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* 홈의 탭바와 같은 높이에 둔다 — 화면 맨 아래에 붙어 엄지가 닿기 어려웠다. */}
        <PrimaryButton
          title={saving ? "예약하는 중..." : "예약하기"}
          onPress={handleConfirm}
          disabled={saving}
          style={[styles.confirmButton, { marginBottom: insets.bottom + TAB_BAR_BOTTOM_MARGIN }]}
        />
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
    paddingTop: space.s8,
    paddingBottom: space.s12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  headerTitle: {
    ...type.body,
    color: colors.text,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    gap: space.s16,
    flex: 1,
  },
  routineName: {
    ...type.title,
    color: colors.text,
  },
  hint: {
    ...type.body,
    color: colors.text2,
  },
  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    padding: space.s16,
    gap: space.s4,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: space.s4,
  },
  calendarTitle: {
    ...type.heading,
    color: colors.text,
  },
  calendarNav: {
    flexDirection: "row",
    gap: space.s16,
  },
  weekRow: {
    flexDirection: "row",
    gap: space.s4,
  },
  weekdayText: {
    ...type.meta,
    flex: 1,
    color: colors.text3,
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
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  // 선택된 날짜는 민트가 아니라 흰색이다(민트는 화면의 주 버튼 하나에만).
  dayCircleActive: {
    backgroundColor: colors.text,
  },
  dayText: {
    ...type.label,
    color: colors.text,
  },
  dayTextDisabled: {
    color: colors.track,
  },
  dayTextActive: {
    color: colors.onAccent,
  },
  confirmButton: {
    marginHorizontal: SCREEN_HORIZONTAL_MARGIN,
  },
});
