// bali-api의 Template/TemplateItem 구조를 그대로 따르는 공용 타입/라벨.
// 실제 데이터는 hooks/api/useTemplates.ts가 API로 가져온다 — 이 파일은 mock을
// 더 이상 들고 있지 않는다.
export type TemplateCategory = "PUSH" | "PULL" | "LEGS" | "STRENGTH";

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  PUSH: "푸시",
  PULL: "풀",
  LEGS: "하체",
  STRENGTH: "전신",
};

export type TemplateItem = {
  id: string;
  exerciseId: string;
  sortOrder: number;
  targetSets?: number;
  targetReps?: number;
  targetWeight?: number;
  targetDurationSeconds?: number;
  targetPace?: number;
};
