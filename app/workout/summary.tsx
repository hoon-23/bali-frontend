import { useNavigation, useRouter } from "expo-router";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
        <Text style={styles.title} numberOfLines={1} lineBreakStrategyIOS="hangul-word">
          {hasAnyRecord ? "수고하셨어요!" : "운동이 종료되었어요."}
        </Text>
        <Text style={styles.subtitle}>
          {logs.length}개 중 {completedCount}개 운동 완료
        </Text>

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
            <View key={log.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.exerciseName}>{log.name}</Text>
                <Text style={[styles.statusText, log.completed && styles.statusTextDone]}>
                  {log.completed ? "완료" : "미완료"}
                </Text>
              </View>
              {isCardio ? (
                <>
                  {targetMinutes > 0 && <Text style={styles.detailLine}>목표 {targetMinutes}분</Text>}
                  {hasLogRecord(log, true) && (
                    <Text style={styles.detailLine}>기록 {formatSetSeconds0(actualSeconds)}</Text>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.detailLine}>
                    목표 {log.targetSets}세트 × {log.targetReps}회{weightSuffix(log.targetWeight)}
                  </Text>
                  {hasLogRecord(log, false) && (
                    <Text style={styles.detailLine}>
                      기록 {Number(log.actualSets)}세트 × {Number(log.actualReps)}회
                      {Number(log.actualWeight) > 0 ? weightSuffix(log.actualWeight as number | string) : ""}
                    </Text>
                  )}
                </>
              )}
            </View>
            );
          })}
        </View>
      </ScrollView>

      <Pressable style={styles.button} onPress={handleConfirm}>
        <Text style={styles.buttonText}>확인</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  scrollContent: {
    alignItems: "center",
    gap: 16,
    paddingBottom: 24,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: "#A0A0A0",
    fontSize: 14,
  },
  list: {
    width: "100%",
    gap: 10,
  },
  card: {
    backgroundColor: "#1C1C25",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 14,
    gap: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  statusText: {
    color: "#6B6B6B",
    fontSize: 12,
    fontWeight: "600",
  },
  statusTextDone: {
    color: "#2DD4BF",
  },
  detailLine: {
    color: "#A0A0A0",
    fontSize: 13,
  },
  button: {
    backgroundColor: "#2DD4BF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#0B0B0F",
    fontSize: 16,
    fontWeight: "600",
  },
});
