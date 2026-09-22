import { MUSCLE_GROUP_KOREAN } from "../../constants/exercises";
import { AnalysisSummaryResponse } from "../../hooks/api/useAnalysis";

export type TopMuscleGroup = { label: string; percent: number; volume: number };

// 볼륨(세트×횟수×무게) 비중이 큰 상위 3개 근육군만 추려서 "집중도" 화면에 쓴다.
export function computeTopMuscleGroups(
  volumeByMuscleGroup: AnalysisSummaryResponse["volumeByMuscleGroup"] | undefined
): TopMuscleGroup[] {
  if (!volumeByMuscleGroup) return [];
  const entries = Object.entries(volumeByMuscleGroup).filter(([, volume]) => (volume ?? 0) > 0) as [
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
      volume: Math.round(volume),
    }));
}
