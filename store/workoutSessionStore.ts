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
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  actualSets: string;
  actualReps: string;
  actualWeight: string;
  completed: boolean;
  setTimings: SetTiming[];
};

export type ActualField = "actualSets" | "actualReps" | "actualWeight";

type WorkoutSessionState = {
  sessionId: string | null;
  isRealSession: boolean;
  logs: ExerciseLog[];
  expandedId: string | null;
  startSession: (sessionId: string, logs: ExerciseLog[], isRealSession: boolean) => void;
  setExpandedId: (id: string | null) => void;
  updateField: (id: string, field: ActualField, value: string) => void;
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

  setExpandedId: (id) =>
    set((state) => ({ expandedId: state.expandedId === id ? null : id })),

  updateField: (id, field, value) =>
    set((state) => ({
      logs: state.logs.map((log) => (log.id === id ? { ...log, [field]: value } : log)),
    })),

  recordSetTiming: (logId, timing) =>
    set((state) => ({
      logs: state.logs.map((log) =>
        log.id === logId ? { ...log, setTimings: [...log.setTimings, timing] } : log
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
