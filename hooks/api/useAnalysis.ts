import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";

export type DailyAnalysisEntry = {
  date: string;
  totalMinutes: number;
  sessionsCount: number;
  completedSets: number;
};

// 기록 없는 날짜는 응답에서 생략됨(sparse) — 화면에서는 0으로 채워서 쓴다.
export function useDailyAnalysis(from: string, to: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["dailyAnalysis", from, to],
    enabled,
    queryFn: async () => {
      const { data } = await apiClient.get<DailyAnalysisEntry[]>("/api/v1/analysis/daily", {
        params: { from, to },
      });
      return data;
    },
  });
}

export type LifetimeStatsResponse = {
  totalWorkoutDays: number;
  totalWorkoutMinutes: number;
};

export function useLifetimeStats() {
  return useQuery({
    queryKey: ["lifetimeStats"],
    queryFn: async () => (await apiClient.get<LifetimeStatsResponse>("/api/v1/analysis/lifetime")).data,
  });
}

// bali-api의 MuscleGroup enum(8종)을 그대로 따름.
export type AnalysisMuscleGroup =
  | "BACK"
  | "CHEST"
  | "SHOULDER"
  | "BICEPS"
  | "TRICEPS"
  | "LEGS"
  | "ABS"
  | "CARDIO";

export type AnalysisSummaryResponse = {
  totalWorkoutMinutes: number;
  volumeByExercise: Record<string, number>;
  volumeByMuscleGroup: Partial<Record<AnalysisMuscleGroup, number>>;
  cardioTotalMinutes: number;
  completionRate: number;
  volumeChangeFromLastWeekPercent: number | null;
};

export type WeeklyAnalysisResponse = {
  weekOf: string;
  status: "SUCCESS" | "FAILED" | "NO_ACTIVITY";
  summary: AnalysisSummaryResponse | null;
  insights: string[];
};

// 이미 배치가 처리한 과거 주 하나를 weekOf(그 주 월요일, YYYY-MM-DD)로 조회.
// 아직 처리되지 않은 미래/너무 이른 주는 404 — 그 경우 null로 취급(화면에서 빈 상태 표시).
export function useWeeklyByDate(weekOf: string | null) {
  return useQuery({
    queryKey: ["weeklyAnalysis", weekOf],
    enabled: !!weekOf,
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<WeeklyAnalysisResponse>(`/api/v1/analysis/weekly/${weekOf}`);
        return data;
      } catch (error: any) {
        if (error?.response?.status === 404) return null;
        throw error;
      }
    },
  });
}
