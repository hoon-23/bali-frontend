import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { CARD_SHADOW } from "../../constants/shadow";
import { formatExerciseName, useExerciseMap } from "../../hooks/api/useExercises";
import { ApiSessionDetail, ApiSessionLogDetail, useSession } from "../../hooks/api/useSessions";

function formatFullKoreanDate(dateISO: string): string {
  const date = new Date(dateISO);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function statusLabel(status: ApiSessionDetail["status"]): string {
  if (status === "COMPLETED") return "완료";
  if (status === "IN_PROGRESS") return "진행중";
  return "예정";
}

function formatSetSeconds(startedAt: string, endedAt: string): string {
  const seconds = Math.max(
    0,
    Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)
  );
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export default function SessionRecordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession(id);
  const exerciseMap = useExerciseMap();

  const logs = session
    ? session.logs.slice().sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
  const defaultExpandedId = logs.find((log) => !log.completed)?.id ?? null;
  const [expandedId, setExpandedId] = useState<string | null>(defaultExpandedId);

  if (!session) {
    return null;
  }

  const isInProgress = session.status === "IN_PROGRESS";

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>세션 기록</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.date}>{formatFullKoreanDate(session.date)}</Text>

          <View style={styles.card}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>{session.title}</Text>
              <View style={[styles.statusBadge, isInProgress && styles.statusBadgeActive]}>
                <Text
                  style={[styles.statusBadgeText, isInProgress && styles.statusBadgeTextActive]}
                >
                  {statusLabel(session.status)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>운동 내역</Text>
          <View style={styles.list}>
            {logs.map((log) => {
              const exercise = exerciseMap.get(log.exerciseId);
              return (
                <ExerciseAccordion
                  key={log.id}
                  log={log}
                  exerciseName={exercise ? formatExerciseName(exercise) : "알 수 없는 운동"}
                  expanded={expandedId === log.id}
                  onToggle={() => setExpandedId((prev) => (prev === log.id ? null : log.id))}
                />
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

type ExerciseAccordionProps = {
  log: ApiSessionLogDetail;
  exerciseName: string;
  expanded: boolean;
  onToggle: () => void;
};

function ExerciseAccordion({ log, exerciseName, expanded, onToggle }: ExerciseAccordionProps) {
  const hasActual = log.actualSets != null || log.actualReps != null || log.actualWeight != null;

  return (
    <View style={styles.card}>
      <Pressable style={styles.exerciseHeader} onPress={onToggle}>
        <View>
          <Text style={styles.exerciseName}>{exerciseName}</Text>
          <Text style={styles.exerciseTarget}>
            목표 {log.targetSets ?? 0}세트 × {log.targetReps ?? 0}회 × {log.targetWeight ?? 0}kg
          </Text>
        </View>
        <View style={styles.exerciseHeaderRight}>
          <View style={[styles.completeBadge, log.completed && styles.completeBadgeActive]}>
            <Text style={[styles.completeBadgeText, log.completed && styles.completeBadgeTextActive]}>
              {log.completed ? "완료" : "미완료"}
            </Text>
          </View>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color="#6B6B6B"
          />
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.detailBody}>
          <Text style={styles.detailLine}>
            기록{" "}
            {hasActual
              ? `${log.actualSets ?? 0}세트 × ${log.actualReps ?? 0}회 × ${log.actualWeight ?? 0}kg`
              : "없음"}
          </Text>
          {log.setTimings && log.setTimings.length > 0 && (
            <View style={styles.timingRow}>
              {log.setTimings
                .slice()
                .sort((a, b) => a.setIndex - b.setIndex)
                .map((timing) => (
                  <Text key={timing.setIndex} style={styles.timingChip}>
                    세트 {timing.setIndex + 1} · {formatSetSeconds(timing.startedAt, timing.endedAt)}
                  </Text>
                ))}
            </View>
          )}
        </View>
      )}
    </View>
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
    backgroundColor: "#1C1C25",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingBottom: 40,
    gap: 16,
  },
  date: {
    color: "#A0A0A0",
    fontSize: 13,
  },
  card: {
    backgroundColor: "#1C1C25",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 16,
    gap: 4,
    ...CARD_SHADOW,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(45, 212, 191, 0.15)",
  },
  statusBadgeActive: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
  },
  statusBadgeText: {
    color: "#2DD4BF",
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadgeTextActive: {
    color: "#FBBF24",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  list: {
    gap: 12,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exerciseName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  exerciseTarget: {
    color: "#A0A0A0",
    fontSize: 12,
    marginTop: 2,
  },
  completeBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  completeBadgeActive: {
    backgroundColor: "rgba(45, 212, 191, 0.15)",
  },
  completeBadgeText: {
    color: "#6B6B6B",
    fontSize: 11,
    fontWeight: "600",
  },
  completeBadgeTextActive: {
    color: "#2DD4BF",
  },
  detailBody: {
    marginTop: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    paddingTop: 10,
  },
  detailLine: {
    color: "#D0D0D0",
    fontSize: 13,
  },
  timingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timingChip: {
    color: "#6B6B6B",
    fontSize: 12,
  },
});
