import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { CARD_SHADOW } from "../../constants/shadow";
import { appAlert } from "../../lib/alert";
import { CATEGORY_LABELS } from "../../store/templatesStore";
import { useWorkoutSessionStore } from "../../store/workoutSessionStore";
import { useExerciseMap } from "../../hooks/api/useExercises";
import { useTemplate } from "../../hooks/api/useTemplates";
import { useCreateSession, usePatchSession } from "../../hooks/api/useSessions";
import { getTodayISODate } from "../../hooks/api/useUpcomingSessions";

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: template } = useTemplate(id);
  const exerciseMap = useExerciseMap();
  const activeSessionId = useWorkoutSessionStore((state) => state.sessionId);
  const createSession = useCreateSession();
  const patchSession = usePatchSession();
  const [starting, setStarting] = useState(false);

  if (!template) {
    return null;
  }

  const handleStart = async () => {
    if (activeSessionId) {
      router.push(`/workout/${activeSessionId}`);
      return;
    }
    setStarting(true);
    try {
      const session = await createSession.mutateAsync({
        date: getTodayISODate(),
        templateId: template.id,
      });
      await patchSession.mutateAsync({ sessionId: session.id, status: "IN_PROGRESS" });
      router.push(`/workout/${session.id}`);
    } catch {
      appAlert("운동을 시작하지 못했어요. 다시 시도해주세요.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>루틴 상세</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.titleRow}>
              <Text style={styles.name}>{template.name}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{CATEGORY_LABELS[template.category]}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>운동 목록</Text>
          <View style={styles.list}>
            {template.items.map((item) => {
              const exercise = exerciseMap.get(item.exerciseId);
              return (
                <View key={item.id} style={styles.itemCard}>
                  <Text style={styles.itemName}>{exercise?.name ?? "알 수 없는 운동"}</Text>
                  <Text style={styles.itemTarget}>
                    {item.targetDurationSeconds
                      ? `${Math.round(item.targetDurationSeconds / 60)}분`
                      : `${item.targetSets}세트 × ${item.targetReps}회 × ${item.targetWeight}kg`}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <Pressable style={styles.startButton} onPress={handleStart} disabled={starting}>
          <Text style={styles.startButtonText}>
            {starting ? "시작하는 중..." : "이 루틴으로 시작하기"}
          </Text>
        </Pressable>
      </SafeAreaView>
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
    paddingBottom: 20,
    gap: 16,
  },
  card: {
    backgroundColor: "#1C1C25",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 16,
    ...CARD_SHADOW,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  categoryBadge: {
    backgroundColor: "rgba(45, 212, 191, 0.15)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  categoryBadgeText: {
    color: "#2DD4BF",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  list: {
    gap: 10,
  },
  itemCard: {
    backgroundColor: "#1C1C25",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 14,
    gap: 4,
    ...CARD_SHADOW,
  },
  itemName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  itemTarget: {
    color: "#A0A0A0",
    fontSize: 13,
  },
  startButton: {
    backgroundColor: "#2DD4BF",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginHorizontal: SCREEN_HORIZONTAL_MARGIN,
    marginBottom: 12,
  },
  startButtonText: {
    color: "#0B0B0F",
    fontSize: 16,
    fontWeight: "700",
  },
});
