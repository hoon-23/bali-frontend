import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";
import { ExerciseMuscleGroup } from "../../constants/exercises";

export type ApiExercise = {
  id: string;
  name: string;
  muscleGroup: ExerciseMuscleGroup;
};

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
