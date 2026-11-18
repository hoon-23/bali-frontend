import { mergeLogs } from "../session/mergeLogs";
import type { ExerciseLog } from "../../store/workoutSessionStore";

const timing = (i: number) => ({ setIndex: i, startedAt: "2026-11-18T00:00:00Z", endedAt: "2026-11-18T00:01:00Z" });

function log(id: string, over: Partial<ExerciseLog> = {}): ExerciseLog {
  return {
    id, exerciseId: id, name: id, sortOrder: 0, targetSets: 3, targetReps: 10, targetWeight: 0,
    targetDurationSeconds: 0, actualSets: "0", actualReps: "10", actualWeight: "0", actualDurationSeconds: "0",
    completed: false, setTimings: [], durationStartedAt: null, setStartedAt: null, setReminderId: null,
    ...over,
  };
}

describe("mergeLogs", () => {
  it("잠금화면과 앱에서 서로 다른 종목의 세트를 끝내면 둘 다 남긴다", () => {
    const app = [log("a", { setTimings: [timing(0)] }), log("b")];
    const widget = [log("a"), log("b", { setTimings: [timing(0)] })];
    const result = mergeLogs(app, widget);
    expect(result.map((l) => l.setTimings.length)).toEqual([1, 1]);
  });

  it("같은 종목은 세트를 더 많이 끝낸 쪽을 고른다", () => {
    const app = [log("a", { setTimings: [timing(0)] })];
    const widget = [log("a", { setTimings: [timing(0), timing(1)] })];
    expect(mergeLogs(app, widget)[0].setTimings).toHaveLength(2);
    expect(mergeLogs(widget, app)[0].setTimings).toHaveLength(2);
  });

  it("완료된 종목은 완료되지 않은 쪽으로 되돌아가지 않는다", () => {
    const app = [log("a", { completed: true, setTimings: [timing(0)] })];
    const widget = [log("a", { setTimings: [timing(0)] })];
    expect(mergeLogs(app, widget)[0].completed).toBe(true);
  });

  it("앱에 없는 종목은 뒤에 붙이고, 같으면 위젯 쪽을 쓴다", () => {
    const widget = [log("a", { setStartedAt: "2026-11-18T00:00:00Z" }), log("c")];
    const result = mergeLogs([log("a", { setStartedAt: "x" })], widget);
    expect(result.map((l) => l.id)).toEqual(["a", "c"]);
    expect(result[0].setStartedAt).toBe("2026-11-18T00:00:00Z");
  });
});
