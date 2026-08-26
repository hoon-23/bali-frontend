import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { appAlert } from "../../lib/alert";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { CARD_SHADOW } from "../../constants/shadow";
import { CATEGORY_LABELS, TemplateCategory } from "../../store/templatesStore";
import { DraftItem, useRoutineBuilderStore } from "../../store/routineBuilderStore";
import { ApiExercise, formatExerciseName, useExerciseMap } from "../../hooks/api/useExercises";
import { useCreateTemplate } from "../../hooks/api/useTemplates";

const CATEGORIES: TemplateCategory[] = ["PUSH", "PULL", "LEGS", "STRENGTH"];

export default function NewRoutineScreen() {
  const router = useRouter();
  const name = useRoutineBuilderStore((state) => state.name);
  const category = useRoutineBuilderStore((state) => state.category);
  const items = useRoutineBuilderStore((state) => state.items);
  const setName = useRoutineBuilderStore((state) => state.setName);
  const setCategory = useRoutineBuilderStore((state) => state.setCategory);
  const removeItem = useRoutineBuilderStore((state) => state.removeItem);
  const updateItemField = useRoutineBuilderStore((state) => state.updateItemField);
  const reset = useRoutineBuilderStore((state) => state.reset);
  const exerciseMap = useExerciseMap();
  const createTemplate = useCreateTemplate();

  useEffect(() => {
    reset();
    // 빌더 화면에 처음 진입할 때만 한 번 실행됨 — 운동 검색 화면으로 갔다가 돌아와도
    // 이 화면은 리마운트되지 않으므로(스택 아래에 그대로 남아있음), 작성 중인 초안을
    // 지우지 않음.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = () => {
    if (!name.trim()) {
      appAlert("루틴 이름을 입력해주세요");
      return;
    }
    if (items.length === 0) {
      appAlert("운동을 1개 이상 추가해주세요");
      return;
    }
    createTemplate.mutate(
      {
        name: name.trim(),
        category,
        items: items.map((item, index) => ({
          exerciseId: item.exerciseId,
          sortOrder: index,
          targetSets: Number(item.targetSets) || 0,
          targetReps: Number(item.targetReps) || 0,
          targetWeight: Number(item.targetWeight) || 0,
        })),
      },
      {
        onSuccess: () => router.back(),
        onError: () => appAlert("루틴 저장에 실패했어요. 다시 시도해주세요."),
      }
    );
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>루틴 만들기</Text>
          <Pressable style={styles.saveButton} onPress={handleSave} hitSlop={8}>
            <Ionicons name="checkmark" size={20} color="#0B0B0F" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Text style={styles.label}>루틴 이름</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="예: 등, 하체"
              placeholderTextColor="#6B6B6B"
            />
          </View>

          <View>
            <Text style={styles.label}>분류</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((item) => {
                const selected = category === item;
                return (
                  <Pressable
                    key={item}
                    style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                    onPress={() => setCategory(item)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selected && styles.categoryChipTextSelected,
                      ]}
                    >
                      {CATEGORY_LABELS[item]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <View style={styles.itemsHeader}>
              <Text style={styles.label}>운동 목록</Text>
              <Pressable
                style={styles.addExerciseButton}
                onPress={() => router.push("/routines/exercise-picker")}
              >
                <Ionicons name="add" size={16} color="#2DD4BF" />
                <Text style={styles.addExerciseText}>운동 추가하기</Text>
              </Pressable>
            </View>

            <View style={styles.itemList}>
              {items.map((item) => (
                <RoutineItemRow
                  key={item.id}
                  item={item}
                  exercise={exerciseMap.get(item.exerciseId)}
                  onRemove={() => removeItem(item.id)}
                  onChangeField={(field, value) => updateItemField(item.id, field, value)}
                />
              ))}
              {items.length === 0 && (
                <Text style={styles.emptyText}>운동을 추가해보세요.</Text>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

type RoutineItemRowProps = {
  item: DraftItem;
  exercise: ApiExercise | undefined;
  onRemove: () => void;
  onChangeField: (field: "targetSets" | "targetReps" | "targetWeight", value: string) => void;
};

function RoutineItemRow({ item, exercise, onRemove, onChangeField }: RoutineItemRowProps) {
  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{exercise ? formatExerciseName(exercise) : "알 수 없는 운동"}</Text>
        <Pressable onPress={onRemove} hitSlop={8}>
          <Ionicons name="close-circle" size={20} color="#6B6B6B" />
        </Pressable>
      </View>
      <View style={styles.itemInputRow}>
        <ItemInput
          label="세트"
          value={item.targetSets}
          onChangeText={(value) => onChangeField("targetSets", value)}
        />
        <ItemInput
          label="횟수"
          value={item.targetReps}
          onChangeText={(value) => onChangeField("targetReps", value)}
        />
        <ItemInput
          label="무게(kg)"
          value={item.targetWeight}
          onChangeText={(value) => onChangeField("targetWeight", value)}
        />
      </View>
    </View>
  );
}

type ItemInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
};

function ItemInput({ label, value, onChangeText }: ItemInputProps) {
  return (
    <View style={styles.itemInputGroup}>
      <Text style={styles.itemInputLabel}>{label}</Text>
      <TextInput
        style={styles.itemInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholderTextColor="#6B6B6B"
      />
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
  saveButton: {
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
    gap: 20,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#1C1C25",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontSize: 15,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
  },
  categoryChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#1C1C25",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  categoryChipSelected: {
    backgroundColor: "#2DD4BF",
    borderColor: "#2DD4BF",
  },
  categoryChipText: {
    color: "#A0A0A0",
    fontSize: 13,
    fontWeight: "600",
  },
  categoryChipTextSelected: {
    color: "#0B0B0F",
  },
  itemsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addExerciseText: {
    color: "#2DD4BF",
    fontSize: 13,
    fontWeight: "600",
  },
  itemList: {
    gap: 10,
  },
  itemCard: {
    backgroundColor: "#1C1C25",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 14,
    gap: 12,
    ...CARD_SHADOW,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  itemInputRow: {
    flexDirection: "row",
    gap: 10,
  },
  itemInputGroup: {
    flex: 1,
    gap: 4,
  },
  itemInputLabel: {
    color: "#6B6B6B",
    fontSize: 11,
  },
  itemInput: {
    backgroundColor: "#0B0B0F",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    color: "#FFFFFF",
    fontSize: 14,
  },
  emptyText: {
    color: "#6B6B6B",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
  },
});
