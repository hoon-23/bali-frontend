import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";

export type WeeklyCurrentResponse = {
  weekOf: string;
  totalWorkoutMinutes: number;
  strengthMinutes: number;
  cardioMinutes: number;
  completedSessionsCount: number;
};

export function useWeeklyCurrent() {
  return useQuery({
    queryKey: ["weeklyCurrent"],
    queryFn: async () => {
      const { data } = await apiClient.get<WeeklyCurrentResponse>("/api/v1/analysis/weekly/current");
      return data;
    },
  });
}
