// 몸무게(kg) 입력 필드 전용 — 정수부 최대 3자리, 소수점 이하 1자리까지만 허용한다.
export function sanitizeWeightInput(value: string): string {
  let cleaned = value.replace(/[^0-9.]/g, "");

  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
  }

  const [intPart, decPart] = cleaned.split(".");
  const trimmedInt = intPart.slice(0, 3);
  if (decPart === undefined) {
    return trimmedInt;
  }
  return `${trimmedInt}.${decPart.slice(0, 1)}`;
}
