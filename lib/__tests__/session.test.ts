import { hasLogRecord, isEmptyFinishedSession } from "../session/logRecord";
import {
  ApiSession,
  deriveUpcomingCardState,
  estimateSessionDurationMinutes,
} from "../session/sessionDisplay";

const noLog = { actualSets: null, actualReps: null, actualDurationSeconds: null };

describe("hasLogRecord", () => {
  it("근력은 세트와 횟수가 모두 0보다 커야 기록이 있다", () => {
    expect(hasLogRecord({ ...noLog, actualSets: 3, actualReps: 10 }, false)).toBe(true);
    expect(hasLogRecord({ ...noLog, actualSets: 3, actualReps: 0 }, false)).toBe(false);
    expect(hasLogRecord({ ...noLog, actualSets: 0, actualReps: 10 }, false)).toBe(false);
    expect(hasLogRecord(noLog, false)).toBe(false);
  });

  it("로컬 입력의 문자열 숫자도 같은 기준으로 판정한다", () => {
    expect(hasLogRecord({ ...noLog, actualSets: "3", actualReps: "10" }, false)).toBe(true);
    expect(hasLogRecord({ ...noLog, actualSets: "", actualReps: "10" }, false)).toBe(false);
  });

  it("유산소는 수행 시간만 본다", () => {
    expect(hasLogRecord({ ...noLog, actualDurationSeconds: 600 }, true)).toBe(true);
    expect(hasLogRecord({ ...noLog, actualDurationSeconds: 0 }, true)).toBe(false);
    expect(hasLogRecord({ ...noLog, actualSets: 3, actualReps: 10 }, true)).toBe(false);
  });
});

describe("isEmptyFinishedSession", () => {
  const strength = () => false;
  type TestLog = {
    exerciseId: string;
    actualSets: number | null;
    actualReps: number | null;
    actualDurationSeconds: number | null;
  };
  const withLogs = (status: string, logs: TestLog[]) => ({ status, logs });
  const recorded = { exerciseId: "e1", actualSets: 3, actualReps: 10, actualDurationSeconds: null };
  const blank = { exerciseId: "e1", ...noLog };

  it("예정과 진행 중 세션은 기록이 없어도 비어 있다고 보지 않는다", () => {
    expect(isEmptyFinishedSession(withLogs("SCHEDULED", [blank]), strength)).toBe(false);
    expect(isEmptyFinishedSession(withLogs("IN_PROGRESS", [blank]), strength)).toBe(false);
  });

  it("종료된 세션에 기록이 하나도 없으면 비어 있다", () => {
    expect(isEmptyFinishedSession(withLogs("COMPLETED", [blank]), strength)).toBe(true);
    expect(isEmptyFinishedSession(withLogs("ABANDONED", [blank]), strength)).toBe(true);
    expect(isEmptyFinishedSession(withLogs("COMPLETED", []), strength)).toBe(true);
  });

  it("기록 있는 로그가 하나라도 있으면 비어 있지 않다", () => {
    expect(isEmptyFinishedSession(withLogs("COMPLETED", [blank, recorded]), strength)).toBe(false);
  });

  it("운동 정보를 모르면(null) 유산소·근력 어느 쪽이든 기록이 있으면 있는 것으로 본다", () => {
    const unknown = () => null;
    const cardio = { exerciseId: "e2", ...noLog, actualDurationSeconds: 900 };
    expect(isEmptyFinishedSession(withLogs("COMPLETED", [recorded]), unknown)).toBe(false);
    expect(isEmptyFinishedSession(withLogs("COMPLETED", [cardio]), unknown)).toBe(false);
    expect(isEmptyFinishedSession(withLogs("COMPLETED", [blank]), unknown)).toBe(true);
  });
});

function session(overrides: Partial<ApiSession> & Pick<ApiSession, "id">): ApiSession {
  return {
    date: "2026-11-05",
    templateId: null,
    status: "SCHEDULED",
    logs: [],
    perceivedDifficulty: null,
    title: "운동",
    ...overrides,
  };
}

describe("deriveUpcomingCardState", () => {
  const today = "2026-11-05";

  it("세션이 없으면 EMPTY", () => {
    expect(deriveUpcomingCardState([], today)).toEqual({ kind: "EMPTY" });
  });

  it("오늘 세션이 있으면 TODAY, 다음 예정이 없으면 next는 null", () => {
    const s = session({ id: "a" });
    expect(deriveUpcomingCardState([s], today)).toEqual({ kind: "TODAY", sessions: [s], next: null });
  });

  it("오늘 세션은 진행 중 > 예정 > 완료 순으로 정렬한다", () => {
    const done = session({ id: "done", status: "COMPLETED" });
    const planned = session({ id: "planned", status: "SCHEDULED" });
    const running = session({ id: "running", status: "IN_PROGRESS" });
    const state = deriveUpcomingCardState([done, planned, running], today);
    expect(state.kind).toBe("TODAY");
    if (state.kind === "TODAY") {
      expect(state.sessions.map((s) => s.id)).toEqual(["running", "planned", "done"]);
    }
  });

  it("예약일보다 일찍 시작한 진행 중 세션도 오늘의 운동에 포함한다", () => {
    const early = session({ id: "early", status: "IN_PROGRESS", date: "2026-11-20" });
    const state = deriveUpcomingCardState([early], today);
    expect(state.kind).toBe("TODAY");
  });

  it("중단된 세션은 오늘의 운동에서 제외한다", () => {
    const abandoned = session({ id: "x", status: "ABANDONED" });
    expect(deriveUpcomingCardState([abandoned], today)).toEqual({ kind: "EMPTY" });
  });

  it("오늘 세션이 없으면 가장 가까운 미래 예정 세션이 NEXT_UPCOMING", () => {
    const far = session({ id: "far", date: "2026-11-30" });
    const near = session({ id: "near", date: "2026-11-10" });
    expect(deriveUpcomingCardState([far, near], today)).toEqual({ kind: "NEXT_UPCOMING", next: near });
  });

  it("미래의 완료 세션은 다음 예정으로 보지 않는다", () => {
    const futureDone = session({ id: "f", date: "2026-11-10", status: "COMPLETED" });
    expect(deriveUpcomingCardState([futureDone], today)).toEqual({ kind: "EMPTY" });
  });

  it("오늘 세션이 있어도 가장 가까운 미래 예정을 next로 함께 돌려준다", () => {
    const todayS = session({ id: "t" });
    const near = session({ id: "n", date: "2026-11-10" });
    const state = deriveUpcomingCardState([todayS, near], today);
    expect(state).toEqual({ kind: "TODAY", sessions: [todayS], next: near });
  });
});

describe("estimateSessionDurationMinutes", () => {
  it("로그가 없으면 0분", () => {
    expect(estimateSessionDurationMinutes([])).toBe(0);
  });

  it("목표 시간이 있으면 시간 기준, 없으면 세트당 1.5분", () => {
    expect(estimateSessionDurationMinutes([{ exerciseId: "a", targetDurationSeconds: 1800 }])).toBe(30);
    expect(estimateSessionDurationMinutes([{ exerciseId: "a", targetSets: 4 }])).toBe(6);
  });

  it("합산 후 반올림한다", () => {
    expect(estimateSessionDurationMinutes([{ exerciseId: "a", targetSets: 3 }])).toBe(5); // 4.5 -> 5
    expect(
      estimateSessionDurationMinutes([
        { exerciseId: "a", targetSets: 4 },
        { exerciseId: "b", targetDurationSeconds: 600 },
      ]),
    ).toBe(16);
  });

  it("목표 세트가 null이면 0으로 본다", () => {
    expect(estimateSessionDurationMinutes([{ exerciseId: "a", targetSets: null }])).toBe(0);
  });
});
