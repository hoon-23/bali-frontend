import { create } from "zustand";
import { TemplateCategory } from "./templatesStore";

const DEFAULT_CARDIO_DURATION_MINUTES = "20";

export type DraftItem = {
  id: string;
  exerciseId: string;
  targetSets: string;
  targetReps: string;
  targetWeight: string;
  targetDurationMinutes: string;
};

type RoutineBuilderState = {
  name: string;
  category: TemplateCategory;
  items: DraftItem[];
  setName: (name: string) => void;
  setCategory: (category: TemplateCategory) => void;
  addItem: (exerciseId: string, isCardio: boolean) => void;
  removeItem: (id: string) => void;
  updateItemField: (
    id: string,
    field: "targetSets" | "targetReps" | "targetWeight" | "targetDurationMinutes",
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

  addItem: (exerciseId, isCardio) =>
    set((state) => ({
      items: [
        ...state.items,
        {
          id: `draft-${Date.now()}`,
          exerciseId,
          targetSets: "3",
          targetReps: "10",
          targetWeight: "20",
          targetDurationMinutes: isCardio ? DEFAULT_CARDIO_DURATION_MINUTES : "",
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
