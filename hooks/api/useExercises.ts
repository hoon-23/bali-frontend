import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";
import { ExerciseMuscleGroup } from "../../constants/exercises";

export type ApiExercise = {
  id: string;
  name: string;
  variant: string | null;
  muscleGroup: ExerciseMuscleGroup;
};

// 같은 이름이라도 그립/자세 variant가 다른 별개 운동일 수 있어서
// (예: 랫풀다운 언더그립/와이드그립/...), 사람이 구분할 수 있게 표시용으로 합침.
export function formatExerciseName(exercise: Pick<ApiExercise, "name" | "variant">): string {
  return exercise.variant ? `${exercise.name} · ${exercise.variant}` : exercise.name;
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
