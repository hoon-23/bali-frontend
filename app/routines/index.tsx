import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { getExerciseById, MUSCLE_GROUP_KOREAN } from "../../constants/exercises";
import { CARD_SHADOW } from "../../constants/shadow";
import { CATEGORY_LABELS, useTemplatesStore, WorkoutTemplate } from "../../store/templatesStore";

function getMuscleGroupChips(template: WorkoutTemplate): string[] {
  const groups = new Set<string>();
  template.items.forEach((item) => {
    const exercise = getExerciseById(item.exerciseId);
    if (exercise) groups.add(MUSCLE_GROUP_KOREAN[exercise.muscleGroup]);
  });
  return Array.from(groups);
}

export default function RoutinesScreen() {
  const router = useRouter();
  const templates = useTemplatesStore((state) => state.templates);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>내 루틴</Text>
          <Pressable
            style={styles.addButton}
            onPress={() => router.push("/routines/new")}
            hitSlop={8}
          >
            <Ionicons name="add" size={22} color="#0B0B0F" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {templates.map((template) => {
            const chips = getMuscleGroupChips(template);
            return (
              <Pressable
                key={template.id}
                style={styles.card}
                onPress={() => router.push(`/routines/${template.id}`)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardName}>{template.name}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{CATEGORY_LABELS[template.category]}</Text>
                  </View>
                </View>
                <Text style={styles.itemCount}>운동 {template.items.length}개</Text>
                <View style={styles.chipRow}>
                  {chips.map((chip) => (
                    <View key={chip} style={styles.chip}>
                      <Text style={styles.chipText}>{chip}</Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            );
          })}

          {templates.length === 0 && (
            <Text style={styles.emptyText}>아직 저장된 루틴이 없어요. + 버튼으로 만들어보세요.</Text>
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2DD4BF",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: "#1C1C25",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 16,
    gap: 8,
    ...CARD_SHADOW,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardName: {
    color: "#FFFFFF",
    fontSize: 16,
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
  itemCount: {
    color: "#A0A0A0",
    fontSize: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  chipText: {
    color: "#A0A0A0",
    fontSize: 11,
  },
  emptyText: {
    color: "#6B6B6B",
    fontSize: 13,
    textAlign: "center",
    marginTop: 40,
  },
});
