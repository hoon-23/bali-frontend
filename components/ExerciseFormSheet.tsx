import { useState } from "react";
import { colors } from "../constants/theme";
import { PressableScale } from "./ui/PressableScale";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppTextInput } from "./AppTextInput";
import { dismissThen, keyboardScrollProps, KeyboardDismissView } from "./KeyboardDismissView";
import {
  EQUIPMENT_KOREAN,
  ExerciseEquipment,
  ExerciseMuscleGroup,
  MUSCLE_GROUP_KOREAN,
} from "../constants/exercises";
import { ApiExercise, ExerciseType, useCreateExercise, useUpdateExercise } from "../hooks/api/useExercises";
import { PlanLimit, getApiErrorMessage, getLimitExceeded } from "../lib/api/planLimit";

const MUSCLE_GROUPS: ExerciseMuscleGroup[] = [
  "CHEST",
  "BACK",
  "SHOULDER",
  "BICEPS",
  "TRICEPS",
  "LEGS",
  "ABS",
  "FUNCTIONAL",
  "CARDIO",
];
const EQUIPMENTS: ExerciseEquipment[] = ["FREE_WEIGHT", "MACHINE", "CABLE", "SMITH", "BODYWEIGHT"];
const TYPES: { value: ExerciseType; label: string }[] = [
  { value: "STRENGTH", label: "근력" },
  { value: "CARDIO", label: "유산소" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  // 지정하면 수정 모드(PUT) — 유형(type)은 수정 불가라 표시만 한다. 없으면 생성 모드.
  exercise?: ApiExercise;
  // 생성 모드에서 이름 입력란을 미리 채울 값(검색어)
  initialName?: string;
  // 생성 성공 시 새 종목 이름을 넘긴다(목록 검색어 채우기 등에 사용).
  onCreated?: (name: string) => void;
  // 무료 플랜 한도 초과(403 PERSONAL_EXERCISE_COUNT) 시 호출 — 안내 시트는 화면이 띄운다.
  onLimit?: (limit: PlanLimit) => void;
};

// 개인 운동 종목 직접 추가/수정 하단 시트.
// presentation:"modal" 화면 위에서 AppAlertModal과 겹침 문제가 없도록 RN <Modal> 대신
// 같은 뷰 트리의 absolute overlay로 그린다(AppAlertModal/PlanLimitSheet와 같은 방식).
export function ExerciseFormSheet({ visible, ...rest }: Props) {
  if (!visible) return null;
  return <SheetBody {...rest} />;
}

function SheetBody({ onClose, onCreated, onLimit, exercise, initialName }: Omit<Props, "visible">) {
  const createExercise = useCreateExercise();
  const updateExercise = useUpdateExercise();
  const isEdit = !!exercise;
  const [name, setName] = useState(exercise?.name ?? initialName ?? "");
  const [variant, setVariant] = useState(exercise?.variant ?? "");
  const [muscleGroup, setMuscleGroup] = useState<ExerciseMuscleGroup | null>(exercise?.muscleGroup ?? null);
  const [type, setType] = useState<ExerciseType | null>(
    exercise ? (exercise.type ?? (exercise.muscleGroup === "CARDIO" ? "CARDIO" : "STRENGTH")) : null
  );
  const [equipment, setEquipment] = useState<ExerciseEquipment | null>(exercise?.equipment ?? null);
  // 안내/서버 오류 메시지 — 자리를 항상 확보(minHeight)해서 나타나도 아래 요소가 밀리지 않는다.
  const [message, setMessage] = useState("");

  const isValid = name.trim().length > 0 && muscleGroup !== null && type !== null;
  const saving = createExercise.isPending || updateExercise.isPending;

  const selectType = (next: ExerciseType) => {
    setType(next);
    setMessage("");
    // 유산소 종목은 부위가 CARDIO로 정해지고, 근력으로 바꾸면 CARDIO 부위는 해제한다.
    if (next === "CARDIO") {
      setMuscleGroup("CARDIO");
      setEquipment(null);
    } else if (muscleGroup === "CARDIO") {
      setMuscleGroup(null);
    }
  };

  const selectMuscleGroup = (next: ExerciseMuscleGroup) => {
    setMuscleGroup(next);
    setMessage("");
    if (next === "CARDIO") {
      setType("CARDIO");
      setEquipment(null);
    } else if (type === "CARDIO") {
      setType("STRENGTH");
    }
  };

  const handleSave = () => {
    if (saving) {
      setMessage("저장 중이에요. 잠시만 기다려주세요.");
      return;
    }
    if (!name.trim()) {
      setMessage("운동 이름을 입력해주세요.");
      return;
    }
    if (!muscleGroup) {
      setMessage("운동 부위를 선택해주세요.");
      return;
    }
    if (!type) {
      setMessage("운동 유형(근력/유산소)을 선택해주세요.");
      return;
    }
    const trimmedName = name.trim();
    const handlers = {
      onSuccess: () => {
        onCreated?.(trimmedName);
        onClose();
      },
      onError: (error: any) => {
        const limit = getLimitExceeded(error);
        if (limit) {
          if (onLimit) {
            onLimit(limit);
          } else {
            // 한도 안내 시트를 못 띄우는 화면(내 운동 관리 등)에서도 조용히 끝나지 않게 시트 안에 알린다.
            setMessage("플랜 한도에 도달해 저장하지 못했어요.");
          }
          return;
        }
        if (error?.response?.status === 409) {
          setMessage("이미 같은 이름의 운동이 있어요.");
          return;
        }
        // 서버 메시지가 한글이면 그대로, 아니면 일반 안내
        const serverMessage = getApiErrorMessage(error);
        setMessage(
          serverMessage && /[가-힣]/.test(serverMessage)
            ? serverMessage
            : isEdit
              ? "운동을 수정하지 못했어요. 다시 시도해주세요."
              : "운동을 만들지 못했어요. 다시 시도해주세요."
        );
      },
    };
    if (exercise) {
      // 수정(PUT)은 type을 받지 않는다 — 생성 때 정한 유형은 바꿀 수 없다.
      updateExercise.mutate(
        {
          id: exercise.id,
          payload: {
            name: trimmedName,
            variant: variant.trim() || undefined,
            muscleGroup,
            equipment: equipment ?? undefined,
          },
        },
        handlers
      );
      return;
    }
    createExercise.mutate(
      {
        name: trimmedName,
        variant: variant.trim() || undefined,
        muscleGroup,
        type,
        equipment: equipment ?? undefined,
      },
      handlers
    );
  };

  // 수정 모드에서는 유형이 고정이라, 유형에 맞는 부위만 고를 수 있게 제한한다.
  const selectableGroups = isEdit
    ? MUSCLE_GROUPS.filter((group) => (type === "CARDIO" ? group === "CARDIO" : group !== "CARDIO"))
    : MUSCLE_GROUPS;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
      pointerEvents="box-none"
    >
      <PressableScale style={styles.backdrop} onPress={onClose} />
      <SafeAreaView edges={["bottom"]} style={styles.sheet}>
        <KeyboardDismissView style={styles.sheetInner}>
          <View style={styles.sheetHeader}>
            <Text style={styles.title}>{isEdit ? "내 운동 수정" : "운동 직접 추가"}</Text>
            <PressableScale onPress={onClose} hitSlop={8}>
              <Text style={styles.cancelText}>취소</Text>
            </PressableScale>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form} {...keyboardScrollProps}>
            <View>
              <Text style={styles.label}>이름 (필수)</Text>
              <AppTextInput
                style={styles.input}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setMessage("");
                }}
                placeholder="예: 인클라인 덤벨 컬"
                placeholderTextColor={colors.text3}
                maxLength={255}
              />
            </View>

            <View>
              <Text style={styles.label}>세부 종류 (선택)</Text>
              <AppTextInput
                style={styles.input}
                value={variant}
                onChangeText={setVariant}
                placeholder="예: 와이드 그립"
                placeholderTextColor={colors.text3}
                maxLength={255}
              />
            </View>

            <View>
              <Text style={styles.label}>{isEdit ? "유형 (수정 불가)" : "유형 (필수)"}</Text>
              <View style={styles.chipRow}>
                {TYPES.filter((item) => !isEdit || item.value === type).map((item) => (
                  <Chip
                    key={item.value}
                    label={item.label}
                    selected={type === item.value}
                    onPress={dismissThen(() => !isEdit && selectType(item.value))}
                  />
                ))}
              </View>
            </View>

            <View>
              <Text style={styles.label}>부위 (필수)</Text>
              <View style={styles.chipRow}>
                {selectableGroups.map((group) => (
                  <Chip
                    key={group}
                    label={MUSCLE_GROUP_KOREAN[group]}
                    selected={muscleGroup === group}
                    onPress={dismissThen(() => selectMuscleGroup(group))}
                  />
                ))}
              </View>
            </View>

            <View>
              <Text style={styles.label}>장비 (선택)</Text>
              <View style={styles.chipRow}>
                {EQUIPMENTS.map((item) => (
                  <Chip
                    key={item}
                    label={EQUIPMENT_KOREAN[item]}
                    selected={equipment === item}
                    onPress={dismissThen(() => setEquipment(equipment === item ? null : item))}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          <Text style={styles.message} lineBreakStrategyIOS="hangul-word">{message}</Text>
          <PressableScale
            style={[styles.saveButton, !isValid && styles.saveButtonToneDown]}
            onPress={() => {
              handleSave();
            }}
          >
            <Text style={[styles.saveButtonText, !isValid && styles.saveButtonTextToneDown]}>
              {saving ? "저장 중..." : "저장"}
            </Text>
          </PressableScale>
        </KeyboardDismissView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <PressableScale style={[styles.chip, selected && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 900,
    elevation: 900,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  sheet: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "88%",
  },
  sheetInner: {
    flex: 0,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  cancelText: {
    color: colors.text2,
    fontSize: 14,
    fontWeight: "600",
  },
  form: {
    gap: 16,
    paddingBottom: 8,
  },
  label: {
    color: colors.text2,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.bg,
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  chipText: {
    color: colors.text2,
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: colors.onAccent,
  },
  message: {
    color: colors.danger,
    fontSize: 12,
    textAlign: "center",
    minHeight: 32,
    paddingTop: 8,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonToneDown: {
    backgroundColor: colors.track,
  },
  saveButtonText: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: "700",
  },
  saveButtonTextToneDown: {
    color: colors.text2,
  },
});
