import { create } from "zustand";

export type SetTiming = {
  setIndex: number;
  startedAt: string;
  endedAt: string;
};

export type ExerciseLog = {
  id: string;
  exerciseId: string;
  name: string;
  sortOrder: number;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  targetDurationSeconds: number;
  actualSets: string;
  actualReps: string;
  actualWeight: string;
  actualDurationSeconds: string;
  completed: boolean;
  setTimings: SetTiming[];
};

export type ActualField = "actualSets" | "actualReps" | "actualWeight" | "actualDurationSeconds";

type WorkoutSessionState = {
  sessionId: string | null;
  isRealSession: boolean;
  logs: ExerciseLog[];
  expandedId: string | null;
  startSession: (sessionId: string, logs: ExerciseLog[], isRealSession: boolean) => void;
  appendLogs: (newLogs: ExerciseLog[]) => void;
  setExpandedId: (id: string | null) => void;
  updateField: (id: string, field: ActualField, value: string) => void;
  adjustActualSets: (id: string, delta: number) => void;
  setTargetSets: (id: string, targetSets: number) => void;
  recordSetTiming: (logId: string, timing: SetTiming) => void;
  completeLog: (id: string) => void;
  endSession: () => void;
};

export const useWorkoutSessionStore = create<WorkoutSessionState>((set, get) => ({
  sessionId: null,
  isRealSession: false,
  logs: [],
  expandedId: null,

  startSession: (sessionId, logs, isRealSession) =>
    set({
      sessionId,
      isRealSession,
      logs,
      expandedId: logs.find((log) => !log.completed)?.id ?? null,
    }),

  appendLogs: (newLogs) =>
    set((state) => ({ logs: [...state.logs, ...newLogs] })),

  setExpandedId: (id) =>
    set((state) => ({ expandedId: state.expandedId === id ? null : id })),

  updateField: (id, field, value) =>
    set((state) => ({
      logs: state.logs.map((log) => (log.id === id ? { ...log, [field]: value } : log)),
    })),

  adjustActualSets: (id, delta) =>
    set((state) => ({
      logs: state.logs.map((log) =>
        log.id === id
          ? {
              ...log,
              actualSets: String(Math.max(0, (Number(log.actualSets) || 0) + delta)),
            }
          : log
      ),
    })),

  setTargetSets: (id, targetSets) =>
    set((state) => ({
      logs: state.logs.map((log) => (log.id === id ? { ...log, targetSets } : log)),
    })),

  recordSetTiming: (logId, timing) =>
    set((state) => ({
      logs: state.logs.map((log) =>
        log.id === logId
          ? {
              ...log,
              setTimings: [...log.setTimings, timing],
              // 타이머로 세트를 완료한 개수는 항상 실제 완료 수만큼 반영한다 — 스테퍼로
              // 수동 조정한 값이 이보다 크면 그 값을 유지하고, 작으면 완료 수까지 끌어올린다.
              actualSets: String(Math.max(Number(log.actualSets) || 0, log.setTimings.length + 1)),
            }
          : log
      ),
    })),

  completeLog: (id) => {
    const updatedLogs = get().logs.map((log) =>
      log.id === id ? { ...log, completed: true } : log,
    );
    const completedIndex = updatedLogs.findIndex((log) => log.id === id);
    const nextIncomplete = updatedLogs
      .slice(completedIndex + 1)
      .find((log) => !log.completed);
    set({ logs: updatedLogs, expandedId: nextIncomplete?.id ?? null });
  },

  endSession: () => set({ sessionId: null, isRealSession: false, logs: [], expandedId: null }),
}));
