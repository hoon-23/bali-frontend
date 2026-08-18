import { create } from "zustand";

export type ExerciseLog = {
  id: string;
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  actualSets: string;
  actualReps: string;
  actualWeight: string;
  completed: boolean;
};

export type ActualField = "actualSets" | "actualReps" | "actualWeight";

type WorkoutSessionState = {
  sessionId: string | null;
  logs: ExerciseLog[];
  expandedId: string | null;
  startSession: (sessionId: string, logs: ExerciseLog[]) => void;
  setExpandedId: (id: string | null) => void;
  updateField: (id: string, field: ActualField, value: string) => void;
  completeLog: (id: string) => void;
  endSession: () => void;
};

export const useWorkoutSessionStore = create<WorkoutSessionState>((set, get) => ({
  sessionId: null,
  logs: [],
  expandedId: null,

  startSession: (sessionId, logs) =>
    set({
      sessionId,
      logs,
      expandedId: logs.find((log) => !log.completed)?.id ?? null,
    }),

  setExpandedId: (id) =>
    set((state) => ({ expandedId: state.expandedId === id ? null : id })),

  updateField: (id, field, value) =>
    set((state) => ({
      logs: state.logs.map((log) => (log.id === id ? { ...log, [field]: value } : log)),
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

  endSession: () => set({ sessionId: null, logs: [], expandedId: null }),
}));
