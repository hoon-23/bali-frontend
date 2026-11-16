import type { TemplateCategory } from "../../store/templatesStore";

// 루틴에 새로 넣는 종목의 목표값과 루틴 분류를 정하는 계산.
// 화면(루틴 만들기, 운동 추가하기)에서 반복하지 않게 한곳에 둔다.

// 서버의 "종목별 최근 기록" 응답 한 건(GET /api/v1/exercises/last-records).
// 기록이 없는 종목은 응답에 아예 없고, 종목 종류에 맞지 않는 칸은 null이다.
export type LastRecord = {
  exerciseId: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  durationSeconds: number | null;
};

export type ResolvedTargets = {
  sets: number;
  reps: number;
  weight: number;
  // 유산소 목표 시간(초). 근력 종목은 0.
  durationSeconds: number;
};

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 15;
const DEFAULT_WEIGHT = 20;
const DEFAULT_CARDIO_SECONDS = 20 * 60;

// 0이나 null은 "기록 없음"으로 보고 기본값을 쓴다.
function positiveOr(value: number | null | undefined, fallback: number): number {
  return typeof value === "number" && value > 0 ? value : fallback;
}

// 새 종목의 목표값 — 직전에 했던 기록이 있으면 그 값을, 없으면 기본값(3세트 15회 20kg, 유산소 20분)을 쓴다.
// 바꿀 것만 고치면 되게 미리 채워 두려는 것이다.
export function resolveTargets(
  exercise: { isCardio: boolean; isBodyweight: boolean },
  record: LastRecord | undefined
): ResolvedTargets {
  if (exercise.isCardio) {
    // 화면의 입력이 분 단위라 초는 분으로 올림한다.
    const seconds = positiveOr(record?.durationSeconds, DEFAULT_CARDIO_SECONDS);
    return { sets: 0, reps: 0, weight: 0, durationSeconds: Math.ceil(seconds / 60) * 60 };
  }
  // 무게 0은 "맨몸으로 했다"는 유효한 기록이라 그대로 쓴다(null일 때만 기본값).
  const weight = exercise.isBodyweight ? 0 : typeof record?.weight === "number" ? record.weight : DEFAULT_WEIGHT;
  return {
    sets: positiveOr(record?.sets, DEFAULT_SETS),
    reps: positiveOr(record?.reps, DEFAULT_REPS),
    weight,
    durationSeconds: 0,
  };
}

// 루틴 분류는 사용자가 고르지 않고 종목 구성으로 정한다 — 초급자에게 "밀기/당기기"는 어려운 선택이고,
// 서버는 이 값을 저장만 한다. 유산소 종목만 있으면 CARDIO, 그 밖에는 STRENGTH.
export function deriveRoutineCategory(isCardioList: boolean[]): TemplateCategory {
  return isCardioList.length > 0 && isCardioList.every(Boolean) ? "CARDIO" : "STRENGTH";
}
