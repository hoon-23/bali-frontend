import { computeTopMuscleGroups } from "../analysis/muscleGroups";

// 테스트용 최소 응답 — 계산에 쓰는 필드만 채우고 나머지는 단언으로 맞춘다.
function summary(fields: Record<string, unknown>) {
  return fields as unknown as Parameters<typeof computeTopMuscleGroups>[0];
}

describe("computeTopMuscleGroups", () => {
  it("응답이 없으면 빈 배열", () => {
    expect(computeTopMuscleGroups(null)).toEqual([]);
    expect(computeTopMuscleGroups(undefined)).toEqual([]);
  });

  it("세트 수 기준으로 큰 순서와 비율을 계산한다", () => {
    const result = computeTopMuscleGroups(summary({ setsByMuscleGroup: { CHEST: 6, BACK: 3, LEGS: 1 } }));
    expect(result).toEqual([
      { label: "가슴", percent: 60 },
      { label: "등", percent: 30 },
      { label: "하체", percent: 10 },
    ]);
  });

  it("세트 수 필드가 없는 구버전 응답은 볼륨으로 대체한다", () => {
    const result = computeTopMuscleGroups(summary({ volumeByMuscleGroup: { CHEST: 100, BACK: 100 } }));
    expect(result.map((r) => r.percent)).toEqual([50, 50]);
  });

  it("세트 수가 있으면 볼륨보다 우선한다 (맨몸 운동 반영)", () => {
    const result = computeTopMuscleGroups(
      summary({ setsByMuscleGroup: { ABS: 5 }, volumeByMuscleGroup: { CHEST: 1000 } }),
    );
    expect(result).toEqual([{ label: "복근", percent: 100 }]);
  });

  it("기본은 상위 3개만, limit에 Infinity를 주면 전부 돌려준다", () => {
    const data = summary({ setsByMuscleGroup: { CHEST: 4, BACK: 3, LEGS: 2, ABS: 1 } });
    expect(computeTopMuscleGroups(data)).toHaveLength(3);
    expect(computeTopMuscleGroups(data, Infinity)).toHaveLength(4);
  });

  it("퍼센트는 상위 일부가 아니라 전체 합계 대비다", () => {
    const data = summary({ setsByMuscleGroup: { CHEST: 4, BACK: 3, LEGS: 2, ABS: 1 } });
    expect(computeTopMuscleGroups(data, 1)).toEqual([{ label: "가슴", percent: 40 }]);
  });

  it("0 이하 값은 제외하고, 합계가 0이면 빈 배열", () => {
    expect(computeTopMuscleGroups(summary({ setsByMuscleGroup: { CHEST: 0, BACK: 0 } }))).toEqual([]);
    const result = computeTopMuscleGroups(summary({ setsByMuscleGroup: { CHEST: 3, BACK: 0 } }));
    expect(result).toEqual([{ label: "가슴", percent: 100 }]);
  });

  it("퍼센트는 반올림이라 합이 100이 아닐 수 있다", () => {
    const result = computeTopMuscleGroups(summary({ setsByMuscleGroup: { CHEST: 1, BACK: 1, LEGS: 1 } }));
    expect(result.map((r) => r.percent)).toEqual([33, 33, 33]);
  });

  it("모르는 근육군은 키 이름을 라벨로 쓴다", () => {
    const result = computeTopMuscleGroups(summary({ setsByMuscleGroup: { NEW_GROUP: 2 } }));
    expect(result).toEqual([{ label: "NEW_GROUP", percent: 100 }]);
  });
});
