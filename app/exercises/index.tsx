import { ChevronLeft, Pencil, Trash2 } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ExerciseFormSheet } from "../../components/ExerciseFormSheet";
import { ScreenBackground } from "../../components/ScreenBackground";
import { EQUIPMENT_KOREAN, MUSCLE_GROUP_KOREAN } from "../../constants/exercises";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { CARD_SHADOW } from "../../constants/shadow";
import { ApiExercise, formatExerciseName, useDeleteExercise, useExercises } from "../../hooks/api/useExercises";
import { appAlert } from "../../lib/alert";
import { getApiErrorMessage } from "../../lib/api/planLimit";

// 프로필 > 내 운동 관리 — 내가 직접 만든(PERSONAL) 운동만 모아서 수정/삭제한다.
export default function MyExercisesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: exercises = [], isLoading } = useExercises();
  const deleteExercise = useDeleteExercise();
  const [editing, setEditing] = useState<ApiExercise | null>(null);

  const personal = useMemo(() => exercises.filter((exercise) => exercise.scope === "PERSONAL"), [exercises]);

  const handleDelete = (exercise: ApiExercise) => {
    appAlert("운동 삭제", `'${formatExerciseName(exercise)}' 운동을 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () =>
          deleteExercise.mutate(exercise.id, {
            onError: (error: any) => {
              const status = error?.response?.status;
              const serverMessage = getApiErrorMessage(error);
              const koreanMessage = serverMessage && /[가-힣]/.test(serverMessage) ? serverMessage : undefined;
              if (status === 404) {
                // 이미 삭제된 운동 — 목록을 다시 불러와 화면과 서버를 맞춘다.
                queryClient.invalidateQueries({ queryKey: ["exercises"] });
                appAlert("이미 삭제된 운동이에요.");
                return;
              }
              if (status === 409) {
                // 활성 루틴이 참조 중이면 서버가 본문 없는 409를 준다.
                appAlert(koreanMessage ?? "루틴에서 사용 중인 운동은 삭제할 수 없어요. 루틴에서 먼저 빼 주세요.");
                return;
              }
              appAlert(koreanMessage ?? "운동을 삭제하지 못했어요. 다시 시도해주세요.");
            },
          }),
      },
    ]);
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>내 운동 관리</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {personal.length === 0 ? (
            <Text style={styles.emptyText} lineBreakStrategyIOS="hangul-word">
              {isLoading
                ? "불러오는 중..."
                : "직접 만든 운동이 없어요.\n운동 추가 화면에서 찾는 운동이 없을 때 직접 추가할 수 있어요."}
            </Text>
          ) : (
            personal.map((exercise) => (
              <Pressable key={exercise.id} style={styles.row} onPress={() => setEditing(exercise)}>
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={2}>
                    {formatExerciseName(exercise)}
                  </Text>
                  <Text style={styles.meta}>
                    {[
                      exercise.type === "CARDIO" ? "유산소" : exercise.type === "STRENGTH" ? "근력" : null,
                      MUSCLE_GROUP_KOREAN[exercise.muscleGroup],
                      exercise.equipment ? EQUIPMENT_KOREAN[exercise.equipment] : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <Pencil size={18} color="#A0A0A0" />
                  <Pressable onPress={() => handleDelete(exercise)} hitSlop={10}>
                    <Trash2 size={18} color="#F87171" />
                  </Pressable>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      <ExerciseFormSheet visible={editing !== null} exercise={editing ?? undefined} onClose={() => setEditing(null)} />
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
  content: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingBottom: 24,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1C1C25",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 14,
    ...CARD_SHADOW,
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  meta: {
    color: "#A0A0A0",
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  emptyText: {
    color: "#6B6B6B",
    fontSize: 13,
    textAlign: "center",
    marginTop: 40,
    lineHeight: 20,
  },
});
