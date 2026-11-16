import { useNavigation, useRouter } from "expo-router";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "../../components/AppText";
import { SwayPalm } from "../../components/SwayPalm";
import { QuietButton } from "../../components/ui/QuietButton";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { colors, space, type } from "../../constants/theme";
import { isBodyweightExercise } from "../../constants/exercises";
import { isCardioExercise, useExerciseMap } from "../../hooks/api/useExercises";
import { formatSetSeconds0 } from "../../lib/format/duration";
import { hasLogRecord } from "../../lib/session/logRecord";
import { XpGainCard } from "../../components/XpGainCard";
import { useWorkoutSessionStore } from "../../store/workoutSessionStore";

// 전환 종료 이벤트를 못 받는 경우(animation: none 등)를 대비한 안전장치 시간(ms).
const TRANSITION_FALLBACK_MS = 1200;

export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, undefined>>>();
  // 화면이 실제로 자리 잡은 뒤에만 경험치 연출을 시작한다(한 번 true가 되면 되돌리지 않는다).
  const [transitionDone, setTransitionDone] = useState(false);
  useEffect(() => {
    const unsubscribe = navigation.addListener("transitionEnd", (e) => {
      if (!e.data.closing) setTransitionDone(true);
    });
    const timer = setTimeout(() => setTransitionDone(true), TRANSITION_FALLBACK_MS);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [navigation]);
  const logs = useWorkoutSessionStore((state) => state.logs);
  const endSession = useWorkoutSessionStore((state) => state.endSession);
  const xpResult = useWorkoutSessionStore((state) => state.xpResult);

  const exerciseMap = useExerciseMap();

  const completedCount = logs.filter((log) => log.completed).length;

  // 기록이 하나라도 있으면(부분 수행 포함) 격려 문구, 없으면 종료 안내 문구
  const hasAnyRecord = logs.some((log) =>
    hasLogRecord(log, isCardioExercise(exerciseMap.get(log.exerciseId)))
  );

  const handleConfirm = () => {
    endSession();
    router.dismissTo("/home");
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 기록이 있을 때만 야자수가 한 번 흔들린다 — "오늘 하루가 쌓였다"는 마무리.
            아무것도 기록하지 않고 끝낸 경우에는 쌓인 것이 없으니 보여주지 않는다. */}
        {hasAnyRecord && <SwayPalm height={112} sway={transitionDone} style={styles.palm} />}
        <AppText style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {hasAnyRecord ? "오늘도 하루 쌓였어요" : "운동이 종료되었어요."}
        </AppText>
        <AppText style={styles.subtitle}>
          {logs.length}개 중 {completedCount}개 운동 완료
        </AppText>

        {xpResult && <XpGainCard xp={xpResult} start={transitionDone} />}

        <View style={styles.list}>
          {logs.map((log) => {
            const weightSuffix = (weight: number | string) =>
              isBodyweightExercise(exerciseMap.get(log.exerciseId)) ? "" : ` × ${weight}kg`;
            const isCardio = isCardioExercise(exerciseMap.get(log.exerciseId));
            // 유산소는 시간 기준으로 표기하고, 근력은 기존 세트×회×kg 표기를 그대로 쓴다.
            const targetMinutes = Math.round((log.targetDurationSeconds ?? 0) / 60);
            const actualSeconds = Number(log.actualDurationSeconds) || 0;
            return (
              <View key={log.id} style={styles.row}>
                <View style={styles.rowHeader}>
                  <AppText style={styles.exerciseName} numberOfLines={1}>
                    {log.name}
                  </AppText>
                  <AppText style={[styles.statusText, log.completed && styles.statusTextDone]}>
                    {log.completed ? "완료" : "미완료"}
                  </AppText>
                </View>
                {isCardio ? (
                  <>
                    {targetMinutes > 0 && <AppText style={styles.detailLine}>목표 {targetMinutes}분</AppText>}
                    {hasLogRecord(log, true) && (
                      <AppText style={styles.detailLine}>기록 {formatSetSeconds0(actualSeconds)}</AppText>
                    )}
                  </>
                ) : (
                  <>
                    <AppText style={styles.detailLine}>
                      목표 {log.targetSets}세트 × {log.targetReps}회{weightSuffix(log.targetWeight)}
                    </AppText>
                    {hasLogRecord(log, false) && (
                      <AppText style={styles.detailLine}>
                        기록 {Number(log.actualSets)}세트 × {Number(log.actualReps)}회
                        {Number(log.actualWeight) > 0 ? weightSuffix(log.actualWeight as number | string) : ""}
                      </AppText>
                    )}
                  </>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
      {/* 이 화면의 민트는 방금 얻은 경험치와 야자수뿐이다 — 확인 버튼은 조용하게 둔다. */}
      <QuietButton title="확인" onPress={handleConfirm} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: space.s40,
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingBottom: space.s24,
    gap: space.s16,
  },
  scrollContent: {
    alignItems: "center",
    paddingBottom: space.s24,
  },
  palm: {
    marginTop: space.s8,
    marginBottom: space.s20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.text,
  },
  subtitle: {
    ...type.body,
    color: colors.text2,
    marginTop: space.s8,
    marginBottom: space.s24,
  },
  list: {
    width: "100%",
    marginTop: space.s24,
  },
  // 상자 없이 얇은 선으로만 나눈다.
  row: {
    paddingVertical: space.s12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.16)",
    gap: space.s4,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.s12,
  },
  exerciseName: {
    ...type.body,
    fontWeight: "600",
    color: colors.text,
    flexShrink: 1,
  },
  statusText: {
    ...type.meta,
    color: colors.text3,
  },
  statusTextDone: {
    color: colors.text,
    fontWeight: "600",
  },
  detailLine: {
    ...type.label,
    fontWeight: "400",
    color: colors.text2,
  },
});
