import { create } from "zustand";
import { TemplateCategory } from "./templatesStore";

export type DraftItem = {
  id: string;
  exerciseId: string;
  targetSets: string;
  targetReps: string;
  targetWeight: string;
};

type RoutineBuilderState = {
  name: string;
  category: TemplateCategory;
  items: DraftItem[];
  setName: (name: string) => void;
  setCategory: (category: TemplateCategory) => void;
  addItem: (exerciseId: string) => void;
  removeItem: (id: string) => void;
  updateItemField: (id: string, field: "targetSets" | "targetReps" | "targetWeight", value: string) => void;
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

  addItem: (exerciseId) =>
    set((state) => ({
      items: [
        ...state.items,
        {
          id: `draft-${Date.now()}`,
          exerciseId,
          targetSets: "3",
          targetReps: "10",
          targetWeight: "20",
        },
      ],
    })),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((item) => item.id !== id) })),

  updateItemField: (id, field, value) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    })),

  reset: () => set({ ...DEFAULT_STATE, items: [] }),
}));
