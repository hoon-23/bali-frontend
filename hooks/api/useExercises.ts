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
