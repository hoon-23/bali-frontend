import { Check, CircleX, GripVertical, Plus, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppTextInput } from "../../components/AppTextInput";
import Animated from "react-native-reanimated";
import { useShake } from "../../components/ui/useShake";
import { KeyboardDismissView, keyboardScrollProps } from "../../components/KeyboardDismissView";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import { appAlert } from "../../lib/alert";
import { isBodyweightExercise } from "../../constants/exercises";
import { sanitizeWeightInput } from "../../lib/format/numberInput";
import { useSingleTapNavigate } from "../../lib/navigation/useSingleTapNavigate";
import { deriveRoutineCategory } from "../../lib/routines/targets";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppAlertModal } from "../../components/AppAlertModal";
import { ScreenBackground } from "../../components/ScreenBackground";
import { PressableScale } from "../../components/ui/PressableScale";
import { colors, radius, space } from "../../constants/theme";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { DraftItem, useRoutineBuilderStore } from "../../store/routineBuilderStore";
import { ApiExercise, formatExerciseName, isCardioExercise, useExerciseMap } from "../../hooks/api/useExercises";
import { PlanLimitSheet } from "../../components/PlanLimitSheet";
import { PlanLimit, getKoreanApiErrorMessage, getLimitExceeded } from "../../lib/api/planLimit";
import { useCreateTemplate } from "../../hooks/api/useTemplates";

export default function NewRoutineScreen() {
  const router = useRouter();
  const name = useRoutineBuilderStore((state) => state.name);
  const items = useRoutineBuilderStore((state) => state.items);
  const setName = useRoutineBuilderStore((state) => state.setName);
  const removeItem = useRoutineBuilderStore((state) => state.removeItem);
  const updateItemField = useRoutineBuilderStore((state) => state.updateItemField);
  const reorderItems = useRoutineBuilderStore((state) => state.reorderItems);
  const reset = useRoutineBuilderStore((state) => state.reset);
  const exerciseMap = useExerciseMap();
  const createTemplate = useCreateTemplate();
  // 무료 플랜 루틴 개수 한도 초과(403 TEMPLATE_COUNT) 시 안내 시트
  const [limitSheet, setLimitSheet] = useState<PlanLimit | null>(null);
  const handleAddExercisePress = useSingleTapNavigate(() => router.push("/routines/exercise-picker"));

  useEffect(() => {
    reset();
    // 빌더 화면에 처음 진입할 때만 한 번 실행됨 — 운동 검색 화면으로 갔다가 돌아와도
    // 이 화면은 리마운트되지 않으므로(스택 아래에 그대로 남아있음), 작성 중인 초안을
    // 지우지 않음.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { style: shakeStyle, shake } = useShake();

  const handleSave = () => {
    if (!name.trim()) {
      shake();
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
        // 분류는 사용자가 고르지 않고 종목 구성으로 정한다(유산소만 있으면 유산소, 그 밖에는 전신).
        category: deriveRoutineCategory(items.map((item) => isCardioExercise(exerciseMap.get(item.exerciseId)))),
        items: items.map((item, index) => {
          const exercise = exerciseMap.get(item.exerciseId);
          // 서버 검증은 exercise.type 기준 — CARDIO는 duration만, 그 외(기능성 포함)는 sets/reps/weight만 보낸다.
          if (isCardioExercise(exercise)) {
            return {
              exerciseId: item.exerciseId,
              sortOrder: index,
              targetDurationSeconds: (Number(item.targetDurationMinutes) || 0) * 60,
            };
          }
          return {
            exerciseId: item.exerciseId,
            sortOrder: index,
            targetSets: Number(item.targetSets) || 0,
            targetReps: Number(item.targetReps) || 0,
            // 맨몸 종목은 입력란이 없어도 weight=0을 항상 보낸다
            targetWeight: isBodyweightExercise(exercise) ? 0 : Number(item.targetWeight) || 0,
          };
        }),
      },
      {
        onSuccess: () => router.back(),
        onError: (error) => {
          const limit = getLimitExceeded(error);
          if (limit) {
            setLimitSheet(limit);
            return;
          }
          appAlert(getKoreanApiErrorMessage(error) ?? "루틴 저장에 실패했어요. 다시 시도해주세요.");
        },
      }
    );
  };

  return (
    <ScreenBackground>
      {/* 입력 필드 바깥(빈 영역)을 탭하면 키보드를 내린다(공용 래퍼) */}
      <KeyboardDismissView>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <PressableScale style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <X size={20} color={colors.text} />
          </PressableScale>
          <Text style={styles.headerTitle}>루틴 만들기</Text>
          <PressableScale style={styles.saveButton} onPress={handleSave} hitSlop={8}>
            <Check size={20} color={colors.onAccent} />
          </PressableScale>
        </View>

        <DraggableFlatList
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
          {...keyboardScrollProps}
          data={items}
          keyExtractor={(item) => item.id}
          onDragEnd={({ data }) => reorderItems(data)}
          ListHeaderComponent={
            <View style={styles.headerSections}>
              <Animated.View style={shakeStyle}>
                <Text style={styles.label}>루틴 이름</Text>
                <AppTextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="예: 등, 하체"
                  placeholderTextColor={colors.text3}
                />
              </Animated.View>

              <View style={styles.itemsHeader}>
                <Text style={styles.label}>운동 목록</Text>
                <PressableScale style={styles.addExerciseButton} onPress={handleAddExercisePress}>
                  <Plus size={16} color={colors.text} />
                  <Text style={styles.addExerciseText}>운동 추가하기</Text>
                </PressableScale>
              </View>
            </View>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>운동을 추가해보세요.</Text>}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          renderItem={({ item, drag, isActive }: RenderItemParams<DraftItem>) => (
            <ScaleDecorator>
              <RoutineItemRow
                item={item}
                exercise={exerciseMap.get(item.exerciseId)}
                dragging={isActive}
                onDrag={drag}
                onRemove={() => removeItem(item.id)}
                onChangeField={(field, value) => updateItemField(item.id, field, value)}
              />
            </ScaleDecorator>
          )}
        />
      </SafeAreaView>
      </KeyboardDismissView>
      {/* 이 화면은 presentation:"modal"로 뜨는 네이티브 모달이라, app/_layout.tsx의 전역
          AppAlertModal이 뒤로 깔린다 — 같은 화면 안에 하나 더 마운트해서 위로 뜨게 한다. */}
      <PlanLimitSheet limit={limitSheet} onClose={() => setLimitSheet(null)} />
      <AppAlertModal />
    </ScreenBackground>
  );
}

type RoutineItemRowProps = {
  item: DraftItem;
  exercise: ApiExercise | undefined;
  dragging: boolean;
  onDrag: () => void;
  onRemove: () => void;
  onChangeField: (
    field: "targetSets" | "targetReps" | "targetWeight" | "targetDurationMinutes",
    value: string
  ) => void;
};

function RoutineItemRow({ item, exercise, dragging, onDrag, onRemove, onChangeField }: RoutineItemRowProps) {
  const isCardio = isCardioExercise(exercise);
  const isBodyweight = isBodyweightExercise(exercise);

  return (
    <View style={[styles.itemCard, dragging && styles.itemCardDragging]}>
      <View style={styles.itemHeader}>
        <PressableScale onLongPress={onDrag} disabled={dragging} hitSlop={8} style={styles.dragHandle}>
          <GripVertical size={18} color={colors.text3} />
        </PressableScale>
        <Text style={styles.itemName}>{exercise ? formatExerciseName(exercise) : "알 수 없는 운동"}</Text>
        <PressableScale onPress={onRemove} hitSlop={8}>
          <CircleX size={20} color={colors.text3} />
        </PressableScale>
      </View>
      {isCardio ? (
        <View style={styles.itemInputRow}>
          <ItemInput
            label="목표 시간(분)"
            value={item.targetDurationMinutes}
            onChangeText={(value) => onChangeField("targetDurationMinutes", value)}
          />
        </View>
      ) : (
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
          {!isBodyweight && (
            <ItemInput
              label="무게(kg)"
              value={item.targetWeight}
              onChangeText={(value) => onChangeField("targetWeight", sanitizeWeightInput(value))}
            />
          )}
        </View>
      )}
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
      <AppTextInput
        style={styles.itemInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholderTextColor={colors.text3}
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
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingBottom: 40,
  },
  headerSections: {
    gap: 20,
    marginBottom: 20,
  },
  label: {
    color: colors.text3,
    fontSize: 12,
    marginBottom: space.s8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    paddingVertical: space.s12,
    paddingHorizontal: space.s16,
    color: colors.text,
    fontSize: 15,
  },
  itemsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: space.s4,
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.s4,
    minHeight: 44,
  },
  addExerciseText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  itemSeparator: {
    height: space.s12,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: "transparent",
    padding: 14,
    gap: space.s12,
  },
  itemCardDragging: {
    borderColor: colors.text2,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dragHandle: {
    padding: 2,
  },
  itemName: {
    flex: 1,
    color: colors.text,
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
    color: colors.text3,
    fontSize: 11,
    lineHeight: 14,
  },
  itemInput: {
    backgroundColor: colors.bg,
    borderRadius: 8,
    paddingVertical: space.s8,
    paddingHorizontal: 10,
    color: colors.text,
    fontSize: 14,
  },
  emptyText: {
    color: colors.text2,
    fontSize: 13,
    textAlign: "center",
    marginTop: space.s12,
  },
});
