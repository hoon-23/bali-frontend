import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";
import { MonthlyAnalysisResponse, WeeklyAnalysisResponse } from "./useAnalysis";

export type LatestInsight = {
  text: string;
  // 어느 기간에 대한 인사이트인지 표시용 라벨 (예: "9월 21일~27일 주간", "9월")
  periodLabel: string;
};

// 배치가 저장한 주간/월간 분석(목록 API) 중 인사이트가 있는 가장 최근 것 하나만 고른다.
// /current 응답에는 insights가 없고, 직전 주/월 기록이 없으면(NO_ACTIVITY) 비어 있다.
// 주간은 weekOf+7일, 월간은 다음 달 1일을 "기간이 끝난 시점"으로 보고 둘 중 더 최근 것을 쓴다.
function weekEndISODate(weekOf: string): string {
  const [year, month, day] = weekOf.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 7)).toISOString().slice(0, 10);
}

// 배치 결과가 항상 "지난주"는 아니므로(주간 배치가 밀리거나 기록이 없던 주는 건너뜀) 실제 기간을 표기한다.
function weekRangeLabel(weekOf: string): string {
  const [year, month, day] = weekOf.split("-").map(Number);
  const end = new Date(Date.UTC(year, month - 1, day + 6));
  const sameMonth = end.getUTCMonth() === month - 1;
  const endLabel = sameMonth ? `${end.getUTCDate()}일` : `${end.getUTCMonth() + 1}월 ${end.getUTCDate()}일`;
  return `${month}월 ${day}일~${endLabel} 주간`;
}

function monthEndISODate(monthOf: string): string {
  const [year, month] = monthOf.split("-").map(Number);
  const next = new Date(Date.UTC(year, month, 1));
  return next.toISOString().slice(0, 10);
}

export function pickLatestInsight(
  weekly: WeeklyAnalysisResponse[],
  monthly: MonthlyAnalysisResponse[]
): LatestInsight | null {
  const candidates: (LatestInsight & { endsAt: string })[] = [];
  weekly.forEach((analysis) => {
    const text = analysis.insights?.[0];
    if (text) {
      candidates.push({ text, periodLabel: weekRangeLabel(analysis.weekOf), endsAt: weekEndISODate(analysis.weekOf) });
    }
  });
  monthly.forEach((analysis) => {
    const text = analysis.insights?.[0];
    if (text) {
      candidates.push({
        text,
        periodLabel: `${Number(analysis.monthOf.slice(5, 7))}월`,
        endsAt: monthEndISODate(analysis.monthOf),
      });
    }
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (a.endsAt < b.endsAt ? 1 : -1));
  const { text, periodLabel } = candidates[0];
  return { text, periodLabel };
}

export function useLatestInsight() {
  return useQuery({
    queryKey: ["latestInsight"],
    queryFn: async () => {
      const [weekly, monthly] = await Promise.all([
        apiClient.get<WeeklyAnalysisResponse[]>("/api/v1/analysis/weekly"),
        apiClient.get<MonthlyAnalysisResponse[]>("/api/v1/analysis/monthly"),
      ]);
      return pickLatestInsight(weekly.data, monthly.data);
    },
  });
}
