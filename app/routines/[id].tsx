import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { getExerciseById } from "../../constants/exercises";
import { CARD_SHADOW } from "../../constants/shadow";
import { CATEGORY_LABELS, useTemplatesStore } from "../../store/templatesStore";
import { useWorkoutSessionStore } from "../../store/workoutSessionStore";

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const template = useTemplatesStore((state) => state.getTemplate(id));
  const activeSessionId = useWorkoutSessionStore((state) => state.sessionId);

  if (!template) {
    return null;
  }

  const handleStart = () => {
    if (activeSessionId) {
      router.push(`/workout/${activeSessionId}`);
      return;
    }
    router.push({ pathname: `/workout/${Date.now()}`, params: { templateId: template.id } });
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
              const exercise = getExerciseById(item.exerciseId);
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

        <Pressable style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>이 루틴으로 시작하기</Text>
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
