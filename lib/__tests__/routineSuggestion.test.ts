import { applyRoutineChanges, computeRoutineChanges } from "../routines/routineSuggestion";
import type { TemplateItem } from "../../store/templatesStore";
import type { ExerciseLog } from "../../store/workoutSessionStore";

function item(id: string, exerciseId: string, sortOrder: number, over: Partial<TemplateItem> = {}): TemplateItem {
  return { id, exerciseId, sortOrder, targetSets: 3, targetReps: 20, targetWeight: 15, ...over };
}

function log(exerciseId: string, sortOrder: number, over: Partial<ExerciseLog> = {}): ExerciseLog {
  return {
    id: `l-${exerciseId}-${sortOrder}`, exerciseId, name: exerciseId, sortOrder, targetSets: 3, targetReps: 20,
    targetWeight: 15, targetDurationSeconds: 0, actualSets: "3", actualReps: "20", actualWeight: "15",
    actualDurationSeconds: "0", completed: true, setTimings: [], durationStartedAt: null, setStartedAt: null,
    setReminderId: null, ...over,
  };
}

describe("computeRoutineChanges", () => {
  it("무게를 올려 끝낸 종목만 변경으로 잡는다", () => {
    const changes = computeRoutineChanges(
      [log("a", 0, { actualWeight: "25" }), log("b", 1)],
      [item("1", "a", 0), item("2", "b", 1)]
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].before.weight).toBe(15);
    expect(changes[0].after.weight).toBe(25);
  });

  it("세트·횟수 변경도 잡는다", () => {
    const [change] = computeRoutineChanges([log("a", 0, { actualSets: "4", actualReps: "12" })], [item("1", "a", 0)]);
    expect(change.after).toEqual({ sets: 4, reps: 12, weight: 15 });
  });

  it("완료 표시 없이 중간에 그만둔 종목의 적은 세트 수는 반영하지 않는다", () => {
    const changes = computeRoutineChanges(
      [log("a", 0, { completed: false, actualSets: "1" })],
      [item("1", "a", 0)]
    );
    expect(changes).toHaveLength(0);
  });

  it("기록이 없거나 무게 0(맨몸)이면 기존 값을 둔다", () => {
    expect(computeRoutineChanges([log("a", 0, { actualSets: "0" })], [item("1", "a", 0)])).toHaveLength(0);
    expect(computeRoutineChanges([log("a", 0, { actualWeight: "0" })], [item("1", "a", 0)])).toHaveLength(0);
  });

  it("유산소는 건드리지 않는다", () => {
    const cardio = log("c", 0, { isCardio: true, actualWeight: "99" });
    expect(computeRoutineChanges([cardio], [item("1", "c", 0)])).toHaveLength(0);
  });
});

describe("세트별 기록 기준(가장 많이 한 값)", () => {
  const rec = (weight: number, reps: number) => ({ weight, reps });

  it("25, 25, 20이면 마지막에 낮춘 20이 아니라 25를 제안한다", () => {
    const [change] = computeRoutineChanges(
      [log("a", 0, { actualWeight: "20", setRecords: [rec(25, 12), rec(25, 12), rec(20, 12)] })],
      [item("1", "a", 0)]
    );
    expect(change.after.weight).toBe(25);
  });

  it("횟수가 같으면 더 무거운 쪽을 고른다", () => {
    const [change] = computeRoutineChanges(
      [log("a", 0, { actualWeight: "30", setRecords: [rec(20, 10), rec(30, 10)] })],
      [item("1", "a", 0)]
    );
    expect(change.after.weight).toBe(30);
  });

  it("반복 수는 기준 무게로 한 세트들에서만 고른다", () => {
    const [change] = computeRoutineChanges(
      [log("a", 0, { setRecords: [rec(25, 12), rec(25, 12), rec(20, 20)] })],
      [item("1", "a", 0)]
    );
    expect(change.after).toEqual({ sets: 3, reps: 12, weight: 25 });
  });

  it("세트별 기록이 없는 옛 기록은 마지막 입력값을 쓴다", () => {
    const [change] = computeRoutineChanges([log("a", 0, { actualWeight: "22" })], [item("1", "a", 0)]);
    expect(change.after.weight).toBe(22);
  });
});

describe("applyRoutineChanges", () => {
  it("선택한 종목만 덮어쓴다", () => {
    const logs = [log("a", 0, { actualWeight: "25" }), log("b", 1, { actualWeight: "40" })];
    const items = [item("1", "a", 0), item("2", "b", 1)];
    const result = applyRoutineChanges(logs, items, new Set(["a#0"]));
    expect(result.map((i) => i.targetWeight)).toEqual([25, 15]);
  });

  it("같은 종목이 두 번 있으면 순서대로 짝짓는다", () => {
    const logs = [log("a", 0, { actualWeight: "20" }), log("a", 1, { actualWeight: "30" })];
    const items = [item("1", "a", 0), item("2", "a", 1)];
    const result = applyRoutineChanges(logs, items, new Set(["a#0", "a#1"]));
    expect(result.map((i) => i.targetWeight)).toEqual([20, 30]);
  });
});
