import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { CARD_SHADOW } from "../../constants/shadow";
import { appAlert } from "../../lib/alert";
import { CATEGORY_LABELS, TemplateItem } from "../../store/templatesStore";
import { useWorkoutSessionStore } from "../../store/workoutSessionStore";
import { ApiExercise, formatExerciseName, useExerciseMap } from "../../hooks/api/useExercises";
import { ApiTemplate, toItemsPayload, useDeleteTemplate, useTemplate, useUpdateTemplate } from "../../hooks/api/useTemplates";
import { useCreateSession, usePatchSession } from "../../hooks/api/useSessions";
import { getTodayISODate } from "../../hooks/api/useUpcomingSessions";

type ItemDraft = { targetSets: number; targetReps: number; targetWeight: number };

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

  if (!template) {
    return null;
  }

  const handleDelete = () => {
    appAlert(
      "이 루틴을 삭제할까요?",
      "삭제하면 되돌릴 수 없어요. 이 루틴으로 기록된 과거 운동 기록은 그대로 남아요.",
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

  const handleAddExercise = () => {
    router.push({
      pathname: "/routines/exercise-picker",
      params: { templateId: template.id },
    });
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

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>루틴 상세</Text>
          <Pressable style={styles.backButton} onPress={handleDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color="#F87171" />
          </Pressable>
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
            {template.items.map((item) => (
              <RoutineDetailItemRow
                key={item.id}
                item={item}
                exercise={exerciseMap.get(item.exerciseId)}
                onSave={(draft) => saveItem(template, item.id, draft)}
                onDelete={() => deleteItem(template, item.id)}
              />
            ))}
            {template.items.length === 0 && (
              <Text style={styles.emptyText}>아직 추가된 운동이 없어요.</Text>
            )}
          </View>

          <Pressable style={styles.addExerciseButton} onPress={handleAddExercise}>
            <Ionicons name="add" size={18} color="#2DD4BF" />
            <Text style={styles.addExerciseButtonText}>운동 추가</Text>
          </Pressable>
        </ScrollView>

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
  onSave: (draft: ItemDraft) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
};

// 왼쪽으로 스와이프하면 수정/삭제 버튼이 드러나는 iOS 스타일 리스트 행.
// 수정은 세트/횟수/무게만 인라인으로 바꾼다 — 운동 종목 자체를 바꾸려면 삭제 후 다시 추가.
function RoutineDetailItemRow({ item, exercise, onSave, onDelete }: RoutineDetailItemRowProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [targetSets, setTargetSets] = useState(String(item.targetSets ?? 0));
  const [targetReps, setTargetReps] = useState(String(item.targetReps ?? 0));
  const [targetWeight, setTargetWeight] = useState(String(item.targetWeight ?? 0));

  const handleEditPress = () => {
    swipeableRef.current?.close();
    setTargetSets(String(item.targetSets ?? 0));
    setTargetReps(String(item.targetReps ?? 0));
    setTargetWeight(String(item.targetWeight ?? 0));
    setEditing(true);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onSave({
        targetSets: Number(targetSets) || 0,
        targetReps: Number(targetReps) || 0,
        targetWeight: Number(targetWeight) || 0,
      });
      setEditing(false);
    } catch {
      appAlert("저장하지 못했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePress = async () => {
    try {
      await onDelete();
    } catch {
      swipeableRef.current?.close();
      appAlert("삭제하지 못했어요. 다시 시도해주세요.");
    }
  };

  const exerciseName = exercise ? formatExerciseName(exercise) : "알 수 없는 운동";

  if (editing) {
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{exerciseName}</Text>
          <Pressable onPress={handleConfirm} hitSlop={8} disabled={saving}>
            <Ionicons name="checkmark-circle" size={22} color="#2DD4BF" />
          </Pressable>
        </View>
        <View style={styles.itemInputRow}>
          <ItemInput label="세트" value={targetSets} onChangeText={setTargetSets} />
          <ItemInput label="횟수" value={targetReps} onChangeText={setTargetReps} />
          <ItemInput label="무게(kg)" value={targetWeight} onChangeText={setTargetWeight} />
        </View>
      </View>
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
      overshootRight={false}
      renderRightActions={() => (
        <View style={styles.swipeActions}>
          <Pressable style={[styles.swipeAction, styles.swipeActionEdit]} onPress={handleEditPress}>
            <Ionicons name="create-outline" size={18} color="#0B0B0F" />
            <Text style={styles.swipeActionText}>수정</Text>
          </Pressable>
          <Pressable style={[styles.swipeAction, styles.swipeActionDelete]} onPress={handleDeletePress}>
            <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
            <Text style={[styles.swipeActionText, styles.swipeActionTextDelete]}>삭제</Text>
          </Pressable>
        </View>
      )}
    >
      <View style={styles.itemCard}>
        <Text style={styles.itemName}>{exerciseName}</Text>
        <Text style={styles.itemTarget}>
          {item.targetDurationSeconds
            ? `${Math.round(item.targetDurationSeconds / 60)}분`
            : `${item.targetSets}세트 × ${item.targetReps}회 × ${item.targetWeight}kg`}
        </Text>
      </View>
    </Swipeable>
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
  swipeActions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 8,
  },
  swipeAction: {
    width: 64,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  swipeActionEdit: {
    backgroundColor: "#2DD4BF",
  },
  swipeActionDelete: {
    backgroundColor: "#F87171",
  },
  swipeActionText: {
    color: "#0B0B0F",
    fontSize: 11,
    fontWeight: "700",
  },
  swipeActionTextDelete: {
    color: "#FFFFFF",
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
