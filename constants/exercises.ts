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
  | "CARDIO"
  | "FUNCTIONAL";

export const MUSCLE_GROUP_KOREAN: Record<ExerciseMuscleGroup, string> = {
  BACK: "등",
  CHEST: "가슴",
  SHOULDER: "어깨",
  BICEPS: "이두",
  TRICEPS: "삼두",
  LEGS: "하체",
  ABS: "복근",
  CARDIO: "유산소",
  FUNCTIONAL: "기능성 근력운동",
};

// 8개 근육군을 상체/하체 대분류로 묶은 것 — 백엔드 개념이 아니라 프론트에서만 쓰는
// 필터용 분류라 CARDIO(유산소)는 어느 쪽에도 넣지 않는다.
export type BodyRegion = "UPPER" | "LOWER";

export const BODY_REGION_KOREAN: Record<BodyRegion, string> = {
  UPPER: "상체",
  LOWER: "하체",
};

export const BODY_REGION_MUSCLE_GROUPS: Record<BodyRegion, ExerciseMuscleGroup[]> = {
  UPPER: ["CHEST", "BACK", "SHOULDER", "BICEPS", "TRICEPS", "ABS"],
  LOWER: ["LEGS"],
};

// bali-api의 Equipment enum을 그대로 따름(2026-08-27 백엔드 세션에서 확인).
// 유산소 종목은 장비 분류 대상이 아니라 equipment가 null로 내려옴.
export type ExerciseEquipment = "FREE_WEIGHT" | "MACHINE" | "CABLE" | "SMITH" | "BODYWEIGHT";

export const EQUIPMENT_KOREAN: Record<ExerciseEquipment, string> = {
  FREE_WEIGHT: "프리웨이트",
  MACHINE: "머신",
  CABLE: "케이블",
  SMITH: "스미스",
  BODYWEIGHT: "맨몸",
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
