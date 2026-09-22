import { ChevronLeft, CircleX, GripVertical, Plus, Trash2 } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { CARD_SHADOW } from "../../constants/shadow";
import { appAlert } from "../../lib/alert";
import { sanitizeWeightInput } from "../../lib/format/numberInput";
import { useSingleTapNavigate } from "../../lib/navigation/useSingleTapNavigate";
import { CATEGORY_LABELS, TemplateItem } from "../../store/templatesStore";
import { useWorkoutSessionStore } from "../../store/workoutSessionStore";
import { ApiExercise, formatExerciseName, useExerciseMap } from "../../hooks/api/useExercises";
import { ApiTemplate, toItemsPayload, useDeleteTemplate, useTemplate, useUpdateTemplate } from "../../hooks/api/useTemplates";
import { useCreateSession, usePatchSession } from "../../hooks/api/useSessions";
import { getTodayISODate } from "../../hooks/api/useUpcomingSessions";

type ItemDraft =
  | { targetSets: number; targetReps: number; targetWeight: number }
  | { targetDurationSeconds: number };

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: template } = useTemplate(id);
  const exerciseMap = useExerciseMap();
  const activeSessionId = useWorkoutSessionStore((state) => state.sessionId);
  const createSession = useCreateSession();
  const patchSession = usePatchSession();
  const deleteTemplate = useDeleteTemplate();
  const updateTemplate = useUpdateTemplate();
  const [starting, setStarting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const handleAddExercise = useSingleTapNavigate(() => {
    if (!template) return;
    router.push({
      pathname: "/routines/exercise-picker",
      params: { templateId: template.id },
    });
  });

  if (!template) {
    return null;
  }

  const handleDelete = () => {
    appAlert(
      "이 루틴을 삭제할까요?",
      "삭제하면 되돌릴 수 없어요.\n이 루틴으로 기록된 과거 운동 기록은\n그대로 남아요.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제하기",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTemplate.mutateAsync(template.id);
              router.back();
            } catch {
              appAlert("삭제하지 못했어요. 다시 시도해주세요.");
            }
          },
        },
      ]
    );
  };

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

  const saveItem = (currentTemplate: ApiTemplate, itemId: string, draft: ItemDraft) =>
    updateTemplate.mutateAsync({
      id: currentTemplate.id,
      payload: {
        name: currentTemplate.name,
        category: currentTemplate.category,
        items: toItemsPayload(
          currentTemplate.items.map((item) => (item.id === itemId ? { ...item, ...draft } : item))
        ),
      },
    });

  const deleteItem = (currentTemplate: ApiTemplate, itemId: string) =>
    updateTemplate.mutateAsync({
      id: currentTemplate.id,
      payload: {
        name: currentTemplate.name,
        category: currentTemplate.category,
        items: toItemsPayload(currentTemplate.items.filter((item) => item.id !== itemId)),
      },
    });

  const handleNameBlur = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === template.name) return;
    try {
      await updateTemplate.mutateAsync({
        id: template.id,
        payload: {
          name: trimmed,
          category: template.category,
          items: toItemsPayload(template.items),
        },
      });
    } catch {
      appAlert("루틴 이름을 저장하지 못했어요. 다시 시도해주세요.");
      setNameDraft(template.name);
    }
  };

  // "완료"를 누르면 TextInput이 그 자리에서 바로 언마운트돼서, 네이티브 blur 이벤트가
  // JS로 넘어오기 전에 화면이 이미 바뀌어 onBlur가 씹히는 경우가 있었다 — 편집모드를
  // 끌 때는 blur를 기다리지 않고 직접 저장한다.
  const handleToggleEdit = () => {
    if (!editMode) {
      setNameDraft(template.name);
      setEditMode(true);
      return;
    }
    handleNameBlur();
    setEditMode(false);
  };

  const reorderItems = async (currentTemplate: ApiTemplate, reordered: TemplateItem[]) => {
    try {
      await updateTemplate.mutateAsync({
        id: currentTemplate.id,
        payload: {
          name: currentTemplate.name,
          category: currentTemplate.category,
          items: toItemsPayload(reordered),
        },
      });
    } catch {
      appAlert("순서를 저장하지 못했어요. 다시 시도해주세요.");
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>루틴 상세</Text>
          <View style={styles.headerActions}>
            <Pressable style={styles.backButton} onPress={handleDelete} hitSlop={8}>
              <Trash2 size={18} color="#F87171" />
            </Pressable>
            <Pressable style={styles.editToggle} onPress={handleToggleEdit}>
              <Text style={styles.editToggleText}>{editMode ? "완료" : "편집"}</Text>
            </Pressable>
          </View>
        </View>

        <DraggableFlatList
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
          data={template.items}
          keyExtractor={(item) => item.id}
          dragItemOverflow
          onDragEnd={({ data }) => reorderItems(template, data)}
          ListHeaderComponent={
            <View style={styles.headerSections}>
              <View style={styles.card}>
                <View style={styles.titleRow}>
                  {editMode ? (
                    <TextInput
                      style={styles.nameInput}
                      value={nameDraft}
                      onChangeText={setNameDraft}
                      onBlur={handleNameBlur}
                      placeholderTextColor="#6B6B6B"
                    />
                  ) : (
                    <Text style={styles.name}>{template.name}</Text>
                  )}
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{CATEGORY_LABELS[template.category]}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.sectionTitle}>운동 목록</Text>
            </View>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>아직 추가된 운동이 없어요.</Text>}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          renderItem={({ item, drag, isActive }: RenderItemParams<TemplateItem>) => (
            <ScaleDecorator>
              <RoutineDetailItemRow
                item={item}
                exercise={exerciseMap.get(item.exerciseId)}
                editMode={editMode}
                dragging={isActive}
                onDrag={drag}
                onSave={(draft) => saveItem(template, item.id, draft)}
                onDelete={() => deleteItem(template, item.id)}
              />
            </ScaleDecorator>
          )}
          ListFooterComponent={
            <Pressable style={styles.addExerciseButton} onPress={handleAddExercise}>
              <Plus size={18} color="#2DD4BF" />
              <Text style={styles.addExerciseButtonText}>운동 추가</Text>
            </Pressable>
          }
        />

        <View style={styles.actionRow}>
          <Pressable
            style={styles.scheduleButton}
            onPress={() =>
              router.push({
                pathname: "/routines/schedule",
                params: { templateId: template.id, name: template.name },
              })
            }
          >
            <Text style={styles.scheduleButtonText}>날짜 예약하기</Text>
          </Pressable>
          <Pressable style={styles.startButton} onPress={handleStart} disabled={starting}>
            <Text style={styles.startButtonText}>
              {starting ? "시작하는 중..." : "이 루틴으로 시작하기"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

type RoutineDetailItemRowProps = {
  item: TemplateItem;
  exercise: ApiExercise | undefined;
  editMode: boolean;
  dragging: boolean;
  onDrag: () => void;
  onSave: (draft: ItemDraft) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
};

// 상단 "편집" 버튼을 누르면 그립(드래그 재정렬)+삭제가 드러나고 세트/횟수/무게가
// 바로 입력 가능해진다("루틴 만들기" 화면의 RoutineItemRow와 동일한 인터랙션) —
// 운동 종목 자체를 바꾸려면 삭제 후 다시 추가.
function RoutineDetailItemRow({
  item,
  exercise,
  editMode,
  dragging,
  onDrag,
  onSave,
  onDelete,
}: RoutineDetailItemRowProps) {
  const isCardio = exercise?.muscleGroup === "CARDIO";
  const [targetSets, setTargetSets] = useState(String(item.targetSets ?? 0));
  const [targetReps, setTargetReps] = useState(String(item.targetReps ?? 0));
  const [targetWeight, setTargetWeight] = useState(String(item.targetWeight ?? 0));
  const [targetDurationMinutes, setTargetDurationMinutes] = useState(
    String(Math.round((item.targetDurationSeconds ?? 0) / 60))
  );

  const handleBlurSave = async () => {
    try {
      await onSave(
        isCardio
          ? { targetDurationSeconds: (Number(targetDurationMinutes) || 0) * 60 }
          : {
              targetSets: Number(targetSets) || 0,
              targetReps: Number(targetReps) || 0,
              targetWeight: Number(targetWeight) || 0,
            }
      );
    } catch {
      appAlert("저장하지 못했어요. 다시 시도해주세요.");
    }
  };

  const handleDeletePress = async () => {
    try {
      await onDelete();
    } catch {
      appAlert("삭제하지 못했어요. 다시 시도해주세요.");
    }
  };

  const exerciseName = exercise ? formatExerciseName(exercise) : "알 수 없는 운동";

  return (
    <View style={[styles.itemCard, dragging && styles.itemCardDragging]}>
      <View style={styles.itemHeader}>
        {editMode && (
          <Pressable onLongPress={onDrag} disabled={dragging} hitSlop={8} style={styles.dragHandle}>
            <GripVertical size={18} color="#6B6B6B" />
          </Pressable>
        )}
        <Text style={styles.itemName}>{exerciseName}</Text>
        {editMode && (
          <Pressable onPress={handleDeletePress} hitSlop={8}>
            <CircleX size={20} color="#6B6B6B" />
          </Pressable>
        )}
      </View>
      {editMode ? (
        <View style={styles.itemInputRow}>
          {isCardio ? (
            <ItemInput
              label="목표 시간(분)"
              value={targetDurationMinutes}
              onChangeText={setTargetDurationMinutes}
              onBlur={handleBlurSave}
            />
          ) : (
            <>
              <ItemInput label="세트" value={targetSets} onChangeText={setTargetSets} onBlur={handleBlurSave} />
              <ItemInput label="횟수" value={targetReps} onChangeText={setTargetReps} onBlur={handleBlurSave} />
              <ItemInput
                label="무게(kg)"
                value={targetWeight}
                onChangeText={(value) => setTargetWeight(sanitizeWeightInput(value))}
                onBlur={handleBlurSave}
              />
            </>
          )}
        </View>
      ) : (
        <Text style={styles.itemTarget}>
          {item.targetDurationSeconds
            ? `${Math.round(item.targetDurationSeconds / 60)}분`
            : `${item.targetSets}세트 × ${item.targetReps}회 × ${item.targetWeight}kg`}
        </Text>
      )}
    </View>
  );
}

type ItemInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
};

function ItemInput({ label, value, onChangeText, onBlur }: ItemInputProps) {
  return (
    <View style={styles.itemInputGroup}>
      <Text style={styles.itemInputLabel}>{label}</Text>
      <TextInput
        style={styles.itemInput}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editToggle: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "#1C1C25",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  editToggleText: {
    color: "#2DD4BF",
    fontSize: 13,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingBottom: 20,
  },
  headerSections: {
    gap: 16,
    marginBottom: 16,
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
  nameInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    borderBottomWidth: 1,
    borderBottomColor: "#2DD4BF",
    paddingVertical: 2,
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
  itemSeparator: {
    height: 10,
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
  itemCardDragging: {
    borderColor: "#2DD4BF",
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
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  itemTarget: {
    color: "#A0A0A0",
    fontSize: 13,
  },
  itemInputRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
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
    paddingVertical: 12,
  },
  addExerciseButton: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(45, 212, 191, 0.4)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  addExerciseButtonText: {
    color: "#2DD4BF",
    fontSize: 13,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: SCREEN_HORIZONTAL_MARGIN,
    marginBottom: 12,
  },
  scheduleButton: {
    flex: 1,
    backgroundColor: "#1C1C25",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(45, 212, 191, 0.4)",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  scheduleButtonText: {
    color: "#2DD4BF",
    fontSize: 15,
    fontWeight: "700",
  },
  startButton: {
    flex: 1.4,
    backgroundColor: "#2DD4BF",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  startButtonText: {
    color: "#0B0B0F",
    fontSize: 16,
    fontWeight: "700",
  },
});
