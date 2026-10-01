import { ChevronLeft, Plus } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { MUSCLE_GROUP_KOREAN } from "../../constants/exercises";
import { CARD_SHADOW } from "../../constants/shadow";
import { CATEGORY_LABELS } from "../../store/templatesStore";
import { ApiExercise, useExerciseMap } from "../../hooks/api/useExercises";
import { ApiTemplate, useTemplates } from "../../hooks/api/useTemplates";

function getMuscleGroupChips(template: ApiTemplate, exerciseMap: Map<string, ApiExercise>): string[] {
  const groups = new Set<string>();
  template.items.forEach((item) => {
    const exercise = exerciseMap.get(item.exerciseId);
    if (exercise) groups.add(MUSCLE_GROUP_KOREAN[exercise.muscleGroup]);
  });
  return Array.from(groups);
}

// 최근에 실행한 루틴이 위로 — lastUsedAt 내림차순, 실행 이력이 없는(null) 루틴은 맨 아래.
// 같은 날 실행한 루틴끼리(날짜만 있어 동률)와 이력 없는 루틴끼리는 이름순으로 고정해 순서가 흔들리지 않게 한다.
function sortByRecentlyUsed(templates: ApiTemplate[]): ApiTemplate[] {
  return [...templates].sort((a, b) => {
    // 구버전 응답(필드 없음, undefined)과 null을 같은 "이력 없음"으로 취급한다.
    const aUsed = a.lastUsedAt ?? null;
    const bUsed = b.lastUsedAt ?? null;
    if (aUsed !== bUsed) {
      if (!aUsed) return 1;
      if (!bUsed) return -1;
      return aUsed < bUsed ? 1 : -1;
    }
    return a.name.localeCompare(b.name, "ko");
  });
}

export default function RoutinesScreen() {
  const router = useRouter();
  const { data: rawTemplates = [] } = useTemplates();
  const templates = useMemo(() => sortByRecentlyUsed(rawTemplates), [rawTemplates]);
  const exerciseMap = useExerciseMap();

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>내 루틴</Text>
          <Pressable
            style={styles.addButton}
            onPress={() => router.push("/routines/new")}
            hitSlop={8}
          >
            <Plus size={22} color="#0B0B0F" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {templates.map((template) => {
            const chips = getMuscleGroupChips(template, exerciseMap);
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
