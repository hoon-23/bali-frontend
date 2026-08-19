import { create } from "zustand";

// bali-api의 WorkoutTemplate/TemplateItem 구조를 그대로 따름(2026-08-18 백엔드
// 세션에서 확인) — 나중에 mock 데이터를 실제 API로 바꿀 때 데이터 소스만 교체하면
// 되고, 재설계가 필요 없음.
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

export type WorkoutTemplate = {
  id: string;
  category: TemplateCategory;
  name: string;
  items: TemplateItem[];
};

const INITIAL_TEMPLATES: WorkoutTemplate[] = [
  {
    id: "t1",
    category: "PUSH",
    name: "가슴 · 어깨 운동",
    items: [
      { id: "t1-1", exerciseId: "e1", sortOrder: 0, targetSets: 4, targetReps: 10, targetWeight: 60 },
      { id: "t1-2", exerciseId: "e2", sortOrder: 1, targetSets: 3, targetReps: 12, targetWeight: 12 },
      { id: "t1-3", exerciseId: "e9", sortOrder: 2, targetSets: 3, targetReps: 10, targetWeight: 20 },
    ],
  },
  {
    id: "t2",
    category: "PULL",
    name: "등 운동",
    items: [
      { id: "t2-1", exerciseId: "e6", sortOrder: 0, targetSets: 4, targetReps: 10, targetWeight: 50 },
      { id: "t2-2", exerciseId: "e5", sortOrder: 1, targetSets: 3, targetReps: 6, targetWeight: 100 },
    ],
  },
  {
    id: "t3",
    category: "LEGS",
    name: "하체 운동",
    items: [
      { id: "t3-1", exerciseId: "e3", sortOrder: 0, targetSets: 4, targetReps: 8, targetWeight: 80 },
      { id: "t3-2", exerciseId: "e4", sortOrder: 1, targetSets: 3, targetReps: 12, targetWeight: 100 },
    ],
  },
  {
    id: "t4",
    category: "STRENGTH",
    name: "전신 운동",
    items: [
      { id: "t4-1", exerciseId: "e1", sortOrder: 0, targetSets: 3, targetReps: 10, targetWeight: 20 },
      { id: "t4-2", exerciseId: "e3", sortOrder: 1, targetSets: 3, targetReps: 10, targetWeight: 40 },
      { id: "t4-3", exerciseId: "e6", sortOrder: 2, targetSets: 3, targetReps: 10, targetWeight: 40 },
    ],
  },
];

type TemplatesState = {
  templates: WorkoutTemplate[];
  getTemplate: (id: string) => WorkoutTemplate | undefined;
  addTemplate: (template: Omit<WorkoutTemplate, "id">) => WorkoutTemplate;
};

export const useTemplatesStore = create<TemplatesState>((set, get) => ({
  templates: INITIAL_TEMPLATES,

  getTemplate: (id) => get().templates.find((template) => template.id === id),

  addTemplate: (template) => {
    const newTemplate: WorkoutTemplate = { ...template, id: `t${Date.now()}` };
    set((state) => ({ templates: [...state.templates, newTemplate] }));
    return newTemplate;
  },
}));
