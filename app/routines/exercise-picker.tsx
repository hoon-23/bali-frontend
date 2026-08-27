import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import {
  EQUIPMENT_KOREAN,
  ExerciseEquipment,
  ExerciseMuscleGroup,
  MUSCLE_GROUP_KOREAN,
} from "../../constants/exercises";
import { appAlert } from "../../lib/alert";
import { useRoutineBuilderStore } from "../../store/routineBuilderStore";
import { formatExerciseName, useExercises } from "../../hooks/api/useExercises";
import { toItemsPayload, useTemplate, useUpdateTemplate } from "../../hooks/api/useTemplates";

const MUSCLE_GROUPS: ExerciseMuscleGroup[] = [
  "CHEST",
  "BACK",
  "SHOULDER",
  "BICEPS",
  "TRICEPS",
  "LEGS",
  "ABS",
  "CARDIO",
];

const EQUIPMENTS: ExerciseEquipment[] = ["FREE_WEIGHT", "MACHINE", "CABLE", "SMITH", "BODYWEIGHT"];

export default function ExercisePickerScreen() {
  const { templateId } = useLocalSearchParams<{ templateId?: string }>();
  const router = useRouter();
  const addItem = useRoutineBuilderStore((state) => state.addItem);
  const { data: template } = useTemplate(templateId);
  const updateTemplate = useUpdateTemplate();
  const { data: exercises = [] } = useExercises();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ExerciseMuscleGroup | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<ExerciseEquipment | null>(null);

  const results = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    const matched = trimmedQuery
      ? exercises.filter((exercise) =>
          formatExerciseName(exercise).toLowerCase().includes(trimmedQuery)
        )
      : exercises;
    const byMuscleGroup = filter ? matched.filter((exercise) => exercise.muscleGroup === filter) : matched;
    return equipmentFilter
      ? byMuscleGroup.filter((exercise) => exercise.equipment === equipmentFilter)
      : byMuscleGroup;
  }, [exercises, query, filter, equipmentFilter]);

  const handleSelect = async (exerciseId: string) => {
    // templateId가 있으면 "루틴 상세"에서 기존 루틴에 운동을 추가하는 경로 —
    // 빌더 스토어를 안 거치고 템플릿을 바로 PUT으로 갱신한다.
    if (templateId && template) {
      try {
        await updateTemplate.mutateAsync({
          id: template.id,
          payload: {
            name: template.name,
            category: template.category,
            items: [
              ...toItemsPayload(template.items),
              { exerciseId, sortOrder: template.items.length, targetSets: 3, targetReps: 10, targetWeight: 20 },
            ],
          },
        });
        router.back();
      } catch {
        appAlert("운동을 추가하지 못했어요. 다시 시도해주세요.");
      }
      return;
    }
    addItem(exerciseId);
    router.back();
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>운동 추가하기</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="#6B6B6B" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="운동 이름 검색"
            placeholderTextColor="#6B6B6B"
          />
        </View>

        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, filter === null && styles.filterChipActive]}
            onPress={() => setFilter(null)}
          >
            <Text style={[styles.filterChipText, filter === null && styles.filterChipTextActive]}>
              전체
            </Text>
          </Pressable>
          {MUSCLE_GROUPS.map((group) => (
            <Pressable
              key={group}
              style={[styles.filterChip, filter === group && styles.filterChipActive]}
              onPress={() => setFilter(filter === group ? null : group)}
            >
              <Text
                style={[styles.filterChipText, filter === group && styles.filterChipTextActive]}
              >
                {MUSCLE_GROUP_KOREAN[group]}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, equipmentFilter === null && styles.filterChipActive]}
            onPress={() => setEquipmentFilter(null)}
          >
            <Text
              style={[styles.filterChipText, equipmentFilter === null && styles.filterChipTextActive]}
            >
              전체 장비
            </Text>
          </Pressable>
          {EQUIPMENTS.map((equipment) => (
            <Pressable
              key={equipment}
              style={[styles.filterChip, equipmentFilter === equipment && styles.filterChipActive]}
              onPress={() => setEquipmentFilter(equipmentFilter === equipment ? null : equipment)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  equipmentFilter === equipment && styles.filterChipTextActive,
                ]}
              >
                {EQUIPMENT_KOREAN[equipment]}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {results.map((exercise) => (
            <Pressable
              key={exercise.id}
              style={styles.exerciseRow}
              onPress={() => handleSelect(exercise.id)}
            >
              <View>
                <Text style={styles.exerciseName}>{formatExerciseName(exercise)}</Text>
                <Text style={styles.exerciseGroup}>
                  {exercise.equipment
                    ? `${MUSCLE_GROUP_KOREAN[exercise.muscleGroup]} · ${EQUIPMENT_KOREAN[exercise.equipment]}`
                    : MUSCLE_GROUP_KOREAN[exercise.muscleGroup]}
                </Text>
              </View>
              <Ionicons name="add-circle-outline" size={22} color="#2DD4BF" />
            </Pressable>
          ))}
          {results.length === 0 && (
            <Text style={styles.emptyText}>검색 결과가 없어요.</Text>
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
  headerSpacer: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: SCREEN_HORIZONTAL_MARGIN,
    backgroundColor: "#1C1C25",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#1C1C25",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  filterChipActive: {
    backgroundColor: "#2DD4BF",
    borderColor: "#2DD4BF",
  },
  filterChipText: {
    color: "#A0A0A0",
    fontSize: 13,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#0B0B0F",
  },
  listContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingBottom: 40,
    gap: 10,
  },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1C1C25",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 14,
  },
  exerciseName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  exerciseGroup: {
    color: "#A0A0A0",
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: "#6B6B6B",
    fontSize: 13,
    textAlign: "center",
    marginTop: 40,
  },
});
