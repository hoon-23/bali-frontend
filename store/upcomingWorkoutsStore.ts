import { create } from "zustand";
import { UPCOMING_WORKOUTS, UpcomingWorkout } from "../constants/sessionRecords";
import { TemplateItem } from "./templatesStore";

type UpcomingWorkoutsState = {
  workouts: UpcomingWorkout[];
  getUpcomingWorkout: (id: string) => UpcomingWorkout | undefined;
  updateItem: (
    workoutId: string,
    itemId: string,
    updates: Partial<Pick<TemplateItem, "targetSets" | "targetReps" | "targetWeight">>
  ) => void;
  markStarted: (workoutId: string) => void;
};

export const useUpcomingWorkoutsStore = create<UpcomingWorkoutsState>((set, get) => ({
  workouts: UPCOMING_WORKOUTS,

  getUpcomingWorkout: (id) => get().workouts.find((workout) => workout.id === id),

  updateItem: (workoutId, itemId, updates) =>
    set((state) => ({
      workouts: state.workouts.map((workout) =>
        workout.id !== workoutId
          ? workout
          : {
              ...workout,
              items: workout.items.map((item) =>
                item.id === itemId ? { ...item, ...updates } : item
              ),
            }
      ),
    })),

  markStarted: (workoutId) =>
    set((state) => ({
      workouts: state.workouts.map((workout) =>
        workout.id === workoutId ? { ...workout, status: "IN_PROGRESS" } : workout
      ),
    })),
}));
