import { ChevronDown, ChevronLeft, ChevronUp, Pencil } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { PressableScale } from "../../components/ui/PressableScale";
import { isBodyweightExercise } from "../../constants/exercises";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { colors, radius, space, type } from "../../constants/theme";
import { appAlert } from "../../lib/alert";
import { formatExerciseName, isCardioExercise, useExerciseMap } from "../../hooks/api/useExercises";
import { formatSetSeconds0 } from "../../lib/format/duration";
import { hasLogRecord } from "../../lib/session/logRecord";
import {
  ApiSessionDetail,
  ApiSessionLogDetail,
  useDeleteSession,
  usePatchSession,
  useSession,
} from "../../hooks/api/useSessions";

function formatFullKoreanDate(dateISO: string): string {
  const date = new Date(dateISO);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function statusLabel(status: ApiSessionDetail["status"]): string {
  if (status === "COMPLETED") return "완료";
  if (status === "IN_PROGRESS") return "진행중";
  if (status === "ABANDONED") return "중단";
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
  const patchSession = usePatchSession();
  const deleteSession = useDeleteSession();

  const logs = session
    ? session.logs.slice().sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
  const defaultExpandedId = logs.find((log) => !log.completed)?.id ?? null;
  const [expandedId, setExpandedId] = useState<string | null>(defaultExpandedId);
  const [deleting, setDeleting] = useState(false);

  if (!session) {
    return null;
  }

  const isInProgress = session.status === "IN_PROGRESS";
  const isAbandoned = session.status === "ABANDONED";

  // 진행중으로 표기된 채 남았거나 자동으로 중단된 지난 기록을 완료/예정으로 되돌릴 수 있게 한다.
  const handleChangeStatus = (status: "COMPLETED" | "SCHEDULED") => {
    patchSession.mutate({ sessionId: session.id, status });
  };

  const handleEditStatusPress = () => {
    appAlert("기록 상태 변경", "이 세션을 어떤 상태로 바꿀까요?", [
      { text: "취소", style: "cancel" },
      { text: "완료로 변경", onPress: () => handleChangeStatus("COMPLETED") },
      { text: "예정으로 변경", onPress: () => handleChangeStatus("SCHEDULED") },
    ]);
  };

  const handleDeletePress = () => {
    appAlert("기록을 삭제할까요?", "삭제한 기록은 되돌릴 수 없습니다.", [
      { text: "돌아가기", style: "cancel" },
      {
        text: "기록 삭제",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteSession.mutateAsync(session.id);
            router.back();
          } catch {
            appAlert("기록 삭제에 실패했어요. 다시 시도해주세요.");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <PressableScale style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={20} color={colors.text} />
          </PressableScale>
          <Text style={styles.headerTitle}>세션 기록</Text>
          {isInProgress || isAbandoned ? (
            <PressableScale
              style={styles.backButton}
              onPress={handleEditStatusPress}
              disabled={patchSession.isPending}
              hitSlop={8}
            >
              <Pencil size={18} color={colors.text2} />
            </PressableScale>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.date}>{formatFullKoreanDate(session.date)}</Text>

          <View style={styles.card}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>{session.title}</Text>
              <View
                style={[
                  styles.statusBadge,
                  isInProgress && styles.statusBadgeActive,
                  isAbandoned && styles.statusBadgeAbandoned,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    isInProgress && styles.statusBadgeTextActive,
                    isAbandoned && styles.statusBadgeTextAbandoned,
                  ]}
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
                  isBodyweight={isBodyweightExercise(exercise)}
                  isCardio={isCardioExercise(exercise)}
                  expanded={expandedId === log.id}
                  onToggle={() => setExpandedId((prev) => (prev === log.id ? null : log.id))}
                />
              );
            })}
          </View>
        </ScrollView>

        <PressableScale style={styles.deleteButton} onPress={handleDeletePress} disabled={deleting}>
          <Text style={styles.deleteButtonText}>
            {deleting ? "삭제하는 중..." : "기록 삭제"}
          </Text>
        </PressableScale>
      </SafeAreaView>
    </ScreenBackground>
  );
}

type ExerciseAccordionProps = {
  log: ApiSessionLogDetail;
  exerciseName: string;
  isBodyweight: boolean;
  isCardio: boolean;
  expanded: boolean;
  onToggle: () => void;
};

function ExerciseAccordion({ log, exerciseName, isBodyweight, isCardio, expanded, onToggle }: ExerciseAccordionProps) {
  // 유산소는 시간(초)·페이스 기준으로 표기하고, 근력은 기존 세트×회×kg 표기를 그대로 쓴다.
  const targetMinutes = Math.round((log.targetDurationSeconds ?? 0) / 60);
  const actualSeconds = log.actualDurationSeconds ?? 0;
  // 목표가 전부 null(목표 없이 기록한 세션)이면 "목표 0세트 × 0회"로 보이지 않게 목표 줄을 숨긴다.
  const hasStrengthTarget = log.targetSets != null || log.targetReps != null || log.targetWeight != null;
  const hasCardioActual = actualSeconds > 0 || !!log.actualPace;
  const hasActual = hasLogRecord(log, false);

  return (
    <View style={styles.card}>
      <PressableScale style={styles.exerciseHeader} onPress={onToggle}>
        <View>
          <Text style={styles.exerciseName}>{exerciseName}</Text>
          {isCardio ? (
            targetMinutes > 0 ? <Text style={styles.exerciseTarget}>목표 {targetMinutes}분</Text> : null
          ) : hasStrengthTarget ? (
            <Text style={styles.exerciseTarget}>
              목표 {log.targetSets ?? 0}세트 × {log.targetReps ?? 0}회
              {isBodyweight ? "" : ` × ${log.targetWeight ?? 0}kg`}
            </Text>
          ) : null}
        </View>
        <View style={styles.exerciseHeaderRight}>
          <View style={[styles.completeBadge, log.completed && styles.completeBadgeActive]}>
            <Text style={[styles.completeBadgeText, log.completed && styles.completeBadgeTextActive]}>
              {log.completed ? "완료" : "미완료"}
            </Text>
          </View>
          {expanded ? (
            <ChevronUp size={18} color={colors.text3} />
          ) : (
            <ChevronDown size={18} color={colors.text3} />
          )}
        </View>
      </PressableScale>

      {expanded && (
        <View style={styles.detailBody}>
          {isCardio ? (
            <Text style={styles.detailLine}>
              {hasCardioActual
                ? `시간 ${formatSetSeconds0(actualSeconds)}${log.actualPace ? ` · 페이스 ${log.actualPace}` : ""}`
                : "기록된 시간이 없어요"}
            </Text>
          ) : (
            <Text style={styles.detailLine}>
              기록{" "}
              {hasActual
                ? `${log.actualSets}세트 × ${log.actualReps}회${isBodyweight || !(Number(log.actualWeight) > 0) ? "" : ` × ${log.actualWeight}kg`}`
                : "없음"}
            </Text>
          )}
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
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingBottom: space.s40,
    gap: space.s16,
  },
  date: {
    color: colors.text3,
    fontSize: 12,
  },
  card: {
    paddingVertical: space.s12,
    gap: space.s4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.16)",
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryTitle: {
    ...type.title,
    color: colors.text,
    letterSpacing: -0.6,
    flexShrink: 1,
  },
  statusBadge: {
    paddingVertical: 4,
  },
  statusBadgeActive: {
    paddingVertical: 4,
  },
  statusBadgeText: {
    color: colors.text3,
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadgeTextActive: {
    color: colors.accent,
  },
  statusBadgeAbandoned: {
    paddingVertical: 4,
  },
  statusBadgeTextAbandoned: {
    color: colors.text3,
  },
  sectionTitle: {
    ...type.meta,
    color: colors.text3,
  },
  list: {
    gap: 0,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 44,
    gap: space.s12,
  },
  exerciseHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  exerciseTarget: {
    color: colors.text2,
    fontSize: 12,
    marginTop: 2,
  },
  completeBadge: {
    paddingVertical: 3,
  },
  completeBadgeActive: {
    paddingVertical: 3,
  },
  completeBadgeText: {
    color: colors.text3,
    fontSize: 11,
    fontWeight: "600",
  },
  completeBadgeTextActive: {
    color: colors.text,
  },
  detailBody: {
    marginTop: space.s8,
    gap: space.s8,
    paddingBottom: space.s4,
  },
  detailLine: {
    color: colors.text2,
    fontSize: 13,
  },
  timingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.s8,
  },
  timingChip: {
    color: colors.text3,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    marginBottom: space.s4,
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "600",
  },
});
