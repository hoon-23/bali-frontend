import { getMonthGrid, toISODate } from "../date";

describe("toISODate", () => {
  it("월과 일이 한 자리면 0을 채운다", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("월과 일이 두 자리면 그대로 쓴다", () => {
    expect(toISODate(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("윤년 2월 29일을 표기한다", () => {
    expect(toISODate(new Date(2028, 1, 29))).toBe("2028-02-29");
  });
});

describe("getMonthGrid", () => {
  it("모든 주가 7칸이다", () => {
    for (const [year, month] of [
      [2026, 10],
      [2027, 1],
      [2028, 1],
    ]) {
      const weeks = getMonthGrid(year, month);
      expect(weeks.every((week) => week.length === 7)).toBe(true);
    }
  });

  it("1일이 일요일이면 앞에 빈 칸 6개를 둔다 (월요일 시작)", () => {
    // 2026-11-01은 일요일
    const weeks = getMonthGrid(2026, 10);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, 1]);
  });

  it("1일이 월요일이면 앞에 빈 칸이 없다", () => {
    // 2027-02-01은 월요일, 28일이라 정확히 4주
    const weeks = getMonthGrid(2027, 1);
    expect(weeks).toHaveLength(4);
    expect(weeks[0][0]).toBe(1);
    expect(weeks[3][6]).toBe(28);
  });

  it("마지막 주는 빈 칸으로 7칸을 채운다", () => {
    const weeks = getMonthGrid(2026, 10);
    expect(weeks).toHaveLength(6);
    expect(weeks[5]).toEqual([30, null, null, null, null, null, null]);
  });

  it("윤년 2월은 29일까지 들어 있다", () => {
    const days = getMonthGrid(2028, 1)
      .flat()
      .filter((d): d is number => d !== null);
    expect(days).toHaveLength(29);
    expect(days[0]).toBe(1);
    expect(days[28]).toBe(29);
  });

  it("평년 2월은 28일까지 들어 있다", () => {
    const days = getMonthGrid(2026, 1)
      .flat()
      .filter((d): d is number => d !== null);
    expect(days).toHaveLength(28);
  });
});
