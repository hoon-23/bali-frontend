import { MUSCLE_GROUP_KOREAN } from "../../constants/exercises";
import { AnalysisSummaryResponse } from "../../hooks/api/useAnalysis";

export type TopMuscleGroup = { label: string; percent: number };

// 근육군별 비중이 큰 상위 3개만 추려서 "집중도" 화면에 쓴다. 맨몸 운동은 무게 볼륨이 0이라
// 볼륨 기준이면 빠지므로 세트 수(setsByMuscleGroup)를 우선 쓰고, 구버전 응답이면 볼륨으로 대체한다.
export function computeTopMuscleGroups(summary: AnalysisSummaryResponse | null | undefined): TopMuscleGroup[] {
  const byMuscleGroup = summary?.setsByMuscleGroup ?? summary?.volumeByMuscleGroup;
  if (!byMuscleGroup) return [];
  const entries = Object.entries(byMuscleGroup).filter(([, volume]) => (volume ?? 0) > 0) as [
    string,
    number,
  ][];
  const total = entries.reduce((sum, [, volume]) => sum + volume, 0);
  if (total <= 0) return [];
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([group, volume]) => ({
      label: MUSCLE_GROUP_KOREAN[group as keyof typeof MUSCLE_GROUP_KOREAN] ?? group,
      percent: Math.round((volume / total) * 100),
    }));
}
