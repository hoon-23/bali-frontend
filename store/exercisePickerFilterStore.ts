import { create } from "zustand";
import { BodyRegion, ExerciseEquipment, ExerciseMuscleGroup } from "../constants/exercises";

// 운동 추가 화면은 종목 하나를 고르면 닫히기 때문에, 연달아 여러 운동을 등록할 때마다
// 화면 로컬 state의 필터 칩이 초기화되어 매번 다시 골라야 했다. 칩 선택만 화면 밖에 두어
// 다시 열어도 직전 선택이 유지되게 한다(검색어는 일회성이라 유지하지 않는다).
// bodyRegion이 undefined면 "아직 사용자가 고른 적 없음" — 루틴 분류 기반 기본값을 쓴다.
type ExercisePickerFilterState = {
  bodyRegion: BodyRegion | null | undefined;
  muscleGroup: ExerciseMuscleGroup | null;
  equipment: ExerciseEquipment | null;
  setBodyRegion: (value: BodyRegion | null) => void;
  setMuscleGroup: (value: ExerciseMuscleGroup | null) => void;
  setEquipment: (value: ExerciseEquipment | null) => void;
};

export const useExercisePickerFilterStore = create<ExercisePickerFilterState>((set) => ({
  bodyRegion: undefined,
  muscleGroup: null,
  equipment: null,
  setBodyRegion: (bodyRegion) => set({ bodyRegion }),
  setMuscleGroup: (muscleGroup) => set({ muscleGroup }),
  setEquipment: (equipment) => set({ equipment }),
}));
