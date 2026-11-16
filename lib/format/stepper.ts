// 운동 중 화면의 − / + 버튼용 증감 계산. 값은 입력란과 같은 문자열로 주고받는다
// (스토어의 actualWeight/actualReps가 문자열이라 그대로 넣을 수 있게).
// 입력란이 비었거나 "12."처럼 덜 입력된 상태여도 숫자로 읽어 이어서 계산한다.

const WEIGHT_STEP = 2.5;
// sanitizeWeightInput과 같은 한도(정수 3자리 + 소수 1자리).
const WEIGHT_MAX = 999.9;
const REPS_MAX = 999;

function toNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value: number, max: number): number {
  return Math.min(max, Math.max(0, value));
}

export function stepWeight(value: string, direction: 1 | -1): string {
  const next = clamp(toNumber(value) + direction * WEIGHT_STEP, WEIGHT_MAX);
  // 부동소수 오차(63.8 → 63.800000000000004)를 없애고, 정수면 소수점을 붙이지 않는다.
  return String(Math.round(next * 10) / 10);
}

export function stepReps(value: string, direction: 1 | -1): string {
  return String(clamp(Math.round(toNumber(value)) + direction, REPS_MAX));
}
