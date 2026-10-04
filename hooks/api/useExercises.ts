import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";
import { ExerciseEquipment, ExerciseMuscleGroup } from "../../constants/exercises";

export type ExerciseScope = "GLOBAL" | "PERSONAL";
export type ExerciseType = "STRENGTH" | "CARDIO";

export type ApiExercise = {
  id: string;
  name: string;
  variant: string | null;
  muscleGroup: ExerciseMuscleGroup;
  // GLOBAL: 공용 종목, PERSONAL: 내가 직접 만든 종목(삭제 가능). 구버전 서버 응답엔 없을 수 있어 optional(없으면 GLOBAL로 취급).
  scope?: ExerciseScope;
  type?: ExerciseType;
  // 유산소 종목은 장비 분류가 없어 null로 내려옴.
  equipment: ExerciseEquipment | null;
  equipmentDisplayName: string | null;
};

// 같은 이름이라도 그립/자세 variant가 다른 별개 운동일 수 있어서
// (예: 랫풀다운 언더그립/와이드그립/...), 사람이 구분할 수 있게 표시용으로 합침.
export function formatExerciseName(exercise: Pick<ApiExercise, "name" | "variant">): string {
  return exercise.variant ? `${exercise.name} · ${exercise.variant}` : exercise.name;
}

// 유산소 여부 판단의 단일 기준. 서버 검증이 muscleGroup이 아니라 exercise.type 기준이라
// type을 우선 쓰고, 구버전 서버 응답처럼 type이 없을 때만 muscleGroup===CARDIO로 대신 판단한다.
// (FUNCTIONAL 등 CARDIO 외 부위는 전부 STRENGTH — sets/reps/weight로 다룬다.)
export function isCardioExercise(exercise: Pick<ApiExercise, "type" | "muscleGroup"> | null | undefined): boolean {
  if (!exercise) return false;
  return exercise.type ? exercise.type === "CARDIO" : exercise.muscleGroup === "CARDIO";
}

export function useExercises() {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiExercise[]>("/api/v1/exercises");
      return data;
    },
    staleTime: 1000 * 60 * 30,
  });
}

// 템플릿/세션 응답은 exerciseId만 갖고 있어서, 이름/부위 표시가 필요한 화면에서
// id로 실제 운동 정보를 찾을 때 씀.
export function useExerciseMap() {
  const { data } = useExercises();
  return useMemo(() => new Map((data ?? []).map((exercise) => [exercise.id, exercise])), [data]);
}

export type CreateExercisePayload = {
  name: string;
  variant?: string;
  muscleGroup: ExerciseMuscleGroup;
  type: ExerciseType;
  equipment?: ExerciseEquipment;
};

// 개인 종목 생성 — 무료 플랜 한도 초과 시 403 LIMIT_EXCEEDED(PERSONAL_EXERCISE_COUNT)가 오므로
// 호출부에서 lib/api/planLimit.ts의 getLimitExceeded로 구분한다.
export function useCreateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateExercisePayload) =>
      (await apiClient.post<ApiExercise>("/api/v1/exercises", payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}

// 개인(PERSONAL) 종목만 삭제 가능. 기존 루틴/세션 기록은 서버가 처리한다.
export function useDeleteExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/exercises/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}

export type UpdateExercisePayload = {
  name: string;
  variant?: string;
  muscleGroup: ExerciseMuscleGroup;
  equipment?: ExerciseEquipment;
};

// 개인 종목 수정(PUT) — type은 수정할 수 없어 payload에 없다.
export function useUpdateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateExercisePayload }) =>
      (await apiClient.put<ApiExercise>(`/api/v1/exercises/${id}`, payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}
