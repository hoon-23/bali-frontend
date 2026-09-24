import { create } from "zustand";
import { TemplateCategory } from "./templatesStore";

const DEFAULT_CARDIO_DURATION_MINUTES = "20";
// 기능성(맨몸 코어) 운동은 유산소처럼 "분" 단위를 쓰기엔 목표 시간이 너무 짧아서
// (예: 플랭크 30초 = "0.5분") 별도로 "초" 단위 필드를 둔다.
const DEFAULT_FUNCTIONAL_DURATION_SECONDS = "30";
const DEFAULT_FUNCTIONAL_SETS = "3";

export type ExerciseKind = "CARDIO" | "FUNCTIONAL" | "STRENGTH";

export type DraftItem = {
  id: string;
  exerciseId: string;
  targetSets: string;
  targetReps: string;
  targetWeight: string;
  targetDurationMinutes: string;
  targetDurationSeconds: string;
};

type RoutineBuilderState = {
  name: string;
  category: TemplateCategory;
  items: DraftItem[];
  setName: (name: string) => void;
  setCategory: (category: TemplateCategory) => void;
  addItem: (exerciseId: string, kind: ExerciseKind) => void;
  removeItem: (id: string) => void;
  updateItemField: (
    id: string,
    field: "targetSets" | "targetReps" | "targetWeight" | "targetDurationMinutes" | "targetDurationSeconds",
    value: string
  ) => void;
  reorderItems: (items: DraftItem[]) => void;
  reset: () => void;
};

const DEFAULT_STATE = {
  name: "",
  category: "STRENGTH" as TemplateCategory,
  items: [] as DraftItem[],
};

export const useRoutineBuilderStore = create<RoutineBuilderState>((set) => ({
  ...DEFAULT_STATE,

  setName: (name) => set({ name }),
  setCategory: (category) => set({ category }),

  addItem: (exerciseId, kind) =>
    set((state) => ({
      items: [
        ...state.items,
        {
          id: `draft-${Date.now()}`,
          exerciseId,
          targetSets: kind === "FUNCTIONAL" ? DEFAULT_FUNCTIONAL_SETS : "3",
          targetReps: "10",
          targetWeight: "20",
          targetDurationMinutes: kind === "CARDIO" ? DEFAULT_CARDIO_DURATION_MINUTES : "",
          targetDurationSeconds: kind === "FUNCTIONAL" ? DEFAULT_FUNCTIONAL_DURATION_SECONDS : "",
        },
      ],
    })),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((item) => item.id !== id) })),

  updateItemField: (id, field, value) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    })),

  reorderItems: (items) => set({ items }),

  reset: () => set({ ...DEFAULT_STATE, items: [] }),
}));
