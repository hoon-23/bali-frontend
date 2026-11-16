import { deriveRoutineCategory, resolveTargets } from "../routines/targets";

describe("deriveRoutineCategory", () => {
  it.each([
    [[true, true], "CARDIO"],
    [[false, false], "STRENGTH"],
    [[true, false], "STRENGTH"],
    [[], "STRENGTH"],
  ])("유산소 여부 %j -> %s", (isCardioList, expected) => {
    expect(deriveRoutineCategory(isCardioList as boolean[])).toBe(expected);
  });
});

describe("resolveTargets", () => {
  const strength = { isCardio: false, isBodyweight: false };
  it("기록이 없으면 3세트 15회 20kg", () => {
    expect(resolveTargets(strength, undefined)).toEqual({ sets: 3, reps: 15, weight: 20, durationSeconds: 0 });
  });
  it("직전 기록이 있으면 그 값을 쓴다", () => {
    expect(resolveTargets(strength, { exerciseId: "a", sets: 4, reps: 8, weight: 62.5, durationSeconds: null }))
      .toEqual({ sets: 4, reps: 8, weight: 62.5, durationSeconds: 0 });
  });
  it("직전 기록의 일부가 비었거나 0이면 그 칸만 기본값", () => {
    expect(resolveTargets(strength, { exerciseId: "a", sets: 0, reps: null, weight: 30, durationSeconds: null }))
      .toEqual({ sets: 3, reps: 15, weight: 30, durationSeconds: 0 });
  });
  it("직전 무게가 0이면(맨몸으로 한 기록) 0을 그대로 쓴다", () => {
    expect(resolveTargets(strength, { exerciseId: "a", sets: 3, reps: 10, weight: 0, durationSeconds: null }).weight).toBe(0);
  });
  it("맨몸 종목은 기록과 상관없이 무게 0", () => {
    expect(resolveTargets({ isCardio: false, isBodyweight: true }, { exerciseId: "a", sets: 3, reps: 10, weight: 15, durationSeconds: null }).weight).toBe(0);
  });
  it("유산소는 기록이 없으면 20분, 있으면 분 단위로 올림한 그 시간", () => {
    const cardio = { isCardio: true, isBodyweight: false };
    expect(resolveTargets(cardio, undefined).durationSeconds).toBe(1200);
    expect(resolveTargets(cardio, { exerciseId: "r", sets: null, reps: null, weight: null, durationSeconds: 1510 }).durationSeconds).toBe(1560);
    expect(resolveTargets(cardio, { exerciseId: "r", sets: null, reps: null, weight: null, durationSeconds: 0 }).durationSeconds).toBe(1200);
  });
});
