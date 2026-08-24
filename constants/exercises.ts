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

// 선별된 스톡 사진은 4개뿐(constants/muscleGroups.ts 참고). 운동의 muscleGroup은
// 더 세분화(8개 값)되어 있어서, 각각을 가장 가까운 이미지로 매핑함 — 1:1 매핑이 아니라 근사치.
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
