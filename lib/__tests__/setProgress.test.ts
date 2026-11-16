import { completedSetCount } from "../session/setProgress";

describe("completedSetCount", () => {
  it.each([
    [0, "0", 0],
    [2, "2", 2],
    // 타이머 없이 "완료한 세트"를 손으로 3까지 올린 경우 — 큰 숫자도 그 값을 따라야 한다.
    [0, "3", 3],
    // 손으로 3까지 올린 뒤 타이머로 한 세트를 끝낸 경우(스토어는 actualSets를 3으로 유지한다).
    [1, "3", 3],
    // 타이머 기록이 더 많으면 타이머 기록을 따른다.
    [4, "2", 4],
    [1, "", 1],
    [0, "abc", 0],
    [0, "-2", 0],
  ])("타이머 %d개, 입력 %s -> %d", (timings, actualSets, expected) => {
    expect(completedSetCount(timings, actualSets)).toBe(expected);
  });
});
