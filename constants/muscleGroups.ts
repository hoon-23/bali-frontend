export type MuscleGroup = "cardio" | "legs" | "back" | "chest";

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  cardio: "유산소",
  legs: "하체",
  back: "등",
  chest: "가슴",
};

export const MUSCLE_GROUP_IMAGES: Record<MuscleGroup, number> = {
  cardio: require("../assets/images/muscle-groups/cardio.jpg"),
  legs: require("../assets/images/muscle-groups/legs.jpg"),
  back: require("../assets/images/muscle-groups/back.jpg"),
  chest: require("../assets/images/muscle-groups/chest.jpg"),
};
