import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { ExerciseRecord, SESSION_RECORDS } from "../../constants/sessionRecords";
import { CARD_SHADOW } from "../../constants/shadow";

function chunkNames(names: string[], size: number): string[] {
  const lines: string[] = [];
  for (let i = 0; i < names.length; i += size) {
    lines.push(names.slice(i, i + size).join(", "));
  }
  return lines;
}

export default function SessionRecordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = SESSION_RECORDS.find((record) => record.id === id);

  const defaultExpandedId =
    session?.exercises.find((exercise) => exercise.sets.some((set) => set.inProgress))?.id ?? null;
  const [expandedId, setExpandedId] = useState<string | null>(defaultExpandedId);

  if (!session) {
    return null;
  }

  const nameLines = chunkNames(
    session.exercises.map((exercise) => exercise.name),
    2,
  );
  const isInProgress = session.status === "진행중";

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
          <Text style={styles.date}>{session.date}</Text>

          <View style={styles.card}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>{session.category}</Text>
              <View style={[styles.statusBadge, isInProgress && styles.statusBadgeActive]}>
                <Text
                  style={[styles.statusBadgeText, isInProgress && styles.statusBadgeTextActive]}
                >
                  {session.status}
                </Text>
              </View>
            </View>
            {nameLines.map((line) => (
              <Text key={line} style={styles.summaryLine}>
                {line}
              </Text>
            ))}
          </View>

          <Text style={styles.sectionTitle}>세트 내역</Text>
          <View style={styles.list}>
            {session.exercises.map((exercise) => (
              <ExerciseAccordion
                key={exercise.id}
                exercise={exercise}
                expanded={expandedId === exercise.id}
                onToggle={() => setExpandedId((prev) => (prev === exercise.id ? null : exercise.id))}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

type ExerciseAccordionProps = {
  exercise: ExerciseRecord;
  expanded: boolean;
  onToggle: () => void;
};

function ExerciseAccordion({ exercise, expanded, onToggle }: ExerciseAccordionProps) {
  return (
    <View style={styles.card}>
      <Pressable style={styles.exerciseHeader} onPress={onToggle}>
        <View>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseTarget}>
            목표 {exercise.targetSets}세트 × {exercise.targetReps}회 × {exercise.targetWeight}kg
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color="#6B6B6B"
        />
      </Pressable>

      {expanded && (
        <View style={styles.setList}>
          {exercise.sets.map((set, index) => (
            <View
              key={set.setNumber}
              style={[styles.setRow, index > 0 && styles.setRowDivider]}
            >
              <View>
                <Text style={styles.setExerciseName}>{exercise.name}</Text>
                <Text style={styles.setDetail}>
                  {set.weight}kg × {set.reps}회
                </Text>
              </View>
              {set.inProgress ? (
                <View style={styles.setBadgeActive}>
                  <Text style={styles.setBadgeActiveText}>Set {set.setNumber} · 진행중</Text>
                </View>
              ) : (
                <Text style={styles.setNumber}>Set {set.setNumber}</Text>
              )}
            </View>
          ))}
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
    marginBottom: 4,
  },
  summaryTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  summaryLine: {
    color: "#A0A0A0",
    fontSize: 13,
    lineHeight: 20,
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
  setList: {
    marginTop: 12,
  },
  setRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  setRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  setExerciseName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  setDetail: {
    color: "#A0A0A0",
    fontSize: 12,
    marginTop: 2,
  },
  setNumber: {
    color: "#6B6B6B",
    fontSize: 12,
    fontWeight: "600",
  },
  setBadgeActive: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  setBadgeActiveText: {
    color: "#FBBF24",
    fontSize: 11,
    fontWeight: "700",
  },
});
