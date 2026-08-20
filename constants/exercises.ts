import { MuscleGroup as PhotoMuscleGroup } from "./muscleGroups";

// bali-api의 MuscleGroup enum을 그대로 따름(2026-08-18 백엔드 세션에서 확인).
export type ExerciseMuscleGroup =
  | "BACK"
  | "CHEST"
  | "SHOULDER"
  | "BICEPS"
  | "TRICEPS"
  | "LEGS"
  | "ABS"
  | "CARDIO";

export const MUSCLE_GROUP_KOREAN: Record<ExerciseMuscleGroup, string> = {
  BACK: "등",
  CHEST: "가슴",
  SHOULDER: "어깨",
  BICEPS: "이두",
  TRICEPS: "삼두",
  LEGS: "하체",
  ABS: "복근",
  CARDIO: "유산소",
};

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: ExerciseMuscleGroup;
};

export const EXERCISE_CATALOG: Exercise[] = [
  { id: "e1", name: "벤치 프레스", muscleGroup: "CHEST" },
  { id: "e2", name: "덤벨 플라이", muscleGroup: "CHEST" },
  { id: "e3", name: "스쿼트", muscleGroup: "LEGS" },
  { id: "e4", name: "렉 프레스", muscleGroup: "LEGS" },
  { id: "e5", name: "데드리프트", muscleGroup: "BACK" },
  { id: "e6", name: "랫풀다운", muscleGroup: "BACK" },
  { id: "e7", name: "바이셉스 컬", muscleGroup: "BICEPS" },
  { id: "e8", name: "트라이셉스 익스텐션", muscleGroup: "TRICEPS" },
  { id: "e9", name: "숄더 프레스", muscleGroup: "SHOULDER" },
  { id: "e10", name: "플랭크", muscleGroup: "ABS" },
  { id: "e11", name: "러닝", muscleGroup: "CARDIO" },
  { id: "e12", name: "사이클", muscleGroup: "CARDIO" },
];

export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISE_CATALOG.find((exercise) => exercise.id === id);
}

export function searchExercises(query: string): Exercise[] {
  const trimmed = query.trim();
  if (!trimmed) return EXERCISE_CATALOG;
  return EXERCISE_CATALOG.filter((exercise) => exercise.name.includes(trimmed));
}

// 선별된 스톡 사진은 4개뿐(constants/muscleGroups.ts 참고). 운동 카탈로그의
// muscleGroup은 더 세분화(8개 값)되어 있어서, 각각을 가장 가까운 이미지로
// 매핑함 — 1:1 매핑이 아니라 근사치.
export function toPhotoMuscleGroup(group: ExerciseMuscleGroup): PhotoMuscleGroup {
  switch (group) {
    case "CARDIO":
      return "cardio";
    case "LEGS":
    case "ABS":
      return "legs";
    case "BACK":
      return "back";
    case "CHEST":
    case "SHOULDER":
    case "BICEPS":
    case "TRICEPS":
      return "chest";
  }
}

export function toDisplayMuscleGroup(group: ExerciseMuscleGroup): PhotoMuscleGroup {
  switch (group) {
    case "BACK":
      return "back";
    case "CHEST":
      return "chest";
    case "LEGS":
      return "legs";
    case "CARDIO":
      return "cardio";
    case "SHOULDER":
    case "BICEPS":
    case "TRICEPS":
    case "ABS":
    default:
      // 전용 썸네일 이미지가 없는 상체/코어 종목은 가슴 이미지로 대체(임시 처리)
      return "chest";
  }
}
