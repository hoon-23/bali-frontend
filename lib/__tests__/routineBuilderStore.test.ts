import { useRoutineBuilderStore } from "../../store/routineBuilderStore";

describe("routineBuilderStore.addItems", () => {
  beforeEach(() => useRoutineBuilderStore.getState().reset());

  it("여러 운동을 고른 순서대로 한 번에 추가한다", () => {
    useRoutineBuilderStore.getState().addItems([
      { exerciseId: "a", kind: "STRENGTH" },
      { exerciseId: "b", kind: "CARDIO" },
      { exerciseId: "c", kind: "STRENGTH" },
    ]);
    const { items } = useRoutineBuilderStore.getState();
    expect(items.map((item) => item.exerciseId)).toEqual(["a", "b", "c"]);
  });

  it("같은 순간에 추가해도 항목 id가 겹치지 않는다", () => {
    const { addItems } = useRoutineBuilderStore.getState();
    addItems([
      { exerciseId: "a", kind: "STRENGTH" },
      { exerciseId: "a", kind: "STRENGTH" },
    ]);
    addItems([{ exerciseId: "a", kind: "STRENGTH" }]);
    const ids = useRoutineBuilderStore.getState().items.map((item) => item.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("근력 운동의 기본값은 3세트 15회다", () => {
    useRoutineBuilderStore.getState().addItems([{ exerciseId: "a", kind: "STRENGTH" }]);
    const [item] = useRoutineBuilderStore.getState().items;
    expect(item.targetSets).toBe("3");
    expect(item.targetReps).toBe("15");
    expect(item.targetDurationMinutes).toBe("");
  });

  it("유산소 운동의 기본값은 20분이다", () => {
    useRoutineBuilderStore.getState().addItems([{ exerciseId: "run", kind: "CARDIO" }]);
    expect(useRoutineBuilderStore.getState().items[0].targetDurationMinutes).toBe("20");
  });

  it("이미 있던 항목 뒤에 붙는다", () => {
    const { addItems } = useRoutineBuilderStore.getState();
    addItems([{ exerciseId: "a", kind: "STRENGTH" }]);
    addItems([{ exerciseId: "b", kind: "STRENGTH" }]);
    expect(useRoutineBuilderStore.getState().items.map((item) => item.exerciseId)).toEqual(["a", "b"]);
  });
});
