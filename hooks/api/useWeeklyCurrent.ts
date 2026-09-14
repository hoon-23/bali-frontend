import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";
import { AnalysisSummaryResponse } from "./useAnalysis";

export type WeeklyCurrentResponse = {
  weekOf: string;
  totalWorkoutMinutes: number;
  strengthMinutes: number;
  cardioMinutes: number;
  completedSessionsCount: number;
  // 과거 주(weekly/{weekOf})와 같은 shape의 상세 요약 — volumeByMuscleGroup 등에 사용.
  summary: AnalysisSummaryResponse;
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
