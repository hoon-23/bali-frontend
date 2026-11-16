import { create } from "zustand";
import type { ResolvedTargets } from "../lib/routines/targets";
import { TemplateCategory } from "./templatesStore";

const DEFAULT_CARDIO_DURATION_MINUTES = "20";
// 새로 추가한 근력 운동의 기본 목표 — 바꿀 것만 고치면 되게 미리 채워 둔다.
const DEFAULT_SETS = "3";
const DEFAULT_REPS = "15";
const DEFAULT_WEIGHT = "20";

// 초안 항목 id. 여러 개를 같은 순간에 추가해도 겹치지 않게 시각 대신 순번을 쓴다.
let draftSequence = 0;
function nextDraftId(): string {
  draftSequence += 1;
  return `draft-${draftSequence}`;
}

// 서버 exercise.type 기준 — 기능성(FUNCTIONAL) 등 CARDIO 외 종목은 모두 STRENGTH(세트/횟수/무게).
export type ExerciseKind = "CARDIO" | "STRENGTH";

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
  // 고른 순서대로 여러 운동을 한 번에 추가한다(운동 추가하기 화면의 "N개 추가").
  // targets를 주면(직전 기록 등) 그 값으로, 없으면 기본값으로 채운다.
  addItems: (entries: { exerciseId: string; kind: ExerciseKind; targets?: ResolvedTargets }[]) => void;
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

  addItems: (entries) =>
    set((state) => ({
      items: [
        ...state.items,
        ...entries.map(({ exerciseId, kind, targets }) => ({
          id: nextDraftId(),
          exerciseId,
          targetSets: targets ? String(targets.sets) : DEFAULT_SETS,
          targetReps: targets ? String(targets.reps) : DEFAULT_REPS,
          targetWeight: targets ? String(targets.weight) : DEFAULT_WEIGHT,
          targetDurationMinutes:
            kind !== "CARDIO"
              ? ""
              : targets
                ? String(Math.round(targets.durationSeconds / 60))
                : DEFAULT_CARDIO_DURATION_MINUTES,
        })),
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
