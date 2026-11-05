import { formatSetSeconds0, minutesToDurationText, secondsToKoreanDuration } from "../format/duration";
import { formatThousands } from "../format/number";
import { sanitizeWeightInput } from "../format/numberInput";
import { breakSentences } from "../format/text";

describe("formatThousands", () => {
  it.each([
    [0, "0"],
    [999, "999"],
    [1000, "1,000"],
    [1234567, "1,234,567"],
  ])("%d -> %s", (value, expected) => {
    expect(formatThousands(value)).toBe(expected);
  });

  it("소수는 반올림한다", () => {
    expect(formatThousands(1234.5)).toBe("1,235");
    expect(formatThousands(999.5)).toBe("1,000");
  });
});

describe("minutesToDurationText", () => {
  it.each([
    [0, "0h0m"],
    [90, "1h30m"],
    [1500, "25h0m"],
    [60000, "1,000h0m"],
  ])("%d분 -> %s", (minutes, expected) => {
    expect(minutesToDurationText(minutes)).toBe(expected);
  });

  it("음수는 0으로 본다", () => {
    expect(minutesToDurationText(-5)).toBe("0h0m");
  });

  it("반올림으로 60분이 되면 1시간으로 올린다", () => {
    expect(minutesToDurationText(59.6)).toBe("1h0m");
  });
});

describe("formatSetSeconds0", () => {
  it.each([
    [0, "00:00"],
    [5, "00:05"],
    [65, "01:05"],
    [3600, "60:00"],
  ])("%d초 -> %s", (seconds, expected) => {
    expect(formatSetSeconds0(seconds)).toBe(expected);
  });
});

describe("secondsToKoreanDuration", () => {
  it.each([
    [59, "1분 미만"],
    [60, "1분"],
    [1920, "32분"],
    [3600, "1시간"],
    [3900, "1시간 5분"],
  ])("%d초 -> %s", (seconds, expected) => {
    expect(secondsToKoreanDuration(seconds)).toBe(expected);
  });

  it("음수는 1분 미만으로 본다", () => {
    expect(secondsToKoreanDuration(-10)).toBe("1분 미만");
  });
});

describe("sanitizeWeightInput", () => {
  it.each([
    ["abc", ""],
    ["75", "75"],
    ["1234", "123"],
    ["12.34", "12.3"],
    ["100.55", "100.5"],
    ["1.2.3", "1.2"],
    ["12a.5", "12.5"],
    [".5", ".5"],
  ])("%s -> %s", (input, expected) => {
    expect(sanitizeWeightInput(input)).toBe(expected);
  });
});

describe("breakSentences", () => {
  it("문장부호 뒤 공백을 줄바꿈으로 바꾼다", () => {
    expect(breakSentences("안녕하세요. 반갑습니다? 네! 좋아요")).toBe("안녕하세요.\n반갑습니다?\n네!\n좋아요");
  });

  it("공백이 없는 소수점은 건드리지 않는다", () => {
    expect(breakSentences("1.5kg 기록")).toBe("1.5kg 기록");
  });

  it("이미 있는 줄바꿈은 그대로 둔다", () => {
    expect(breakSentences("끝.\n다음")).toBe("끝.\n다음");
  });

  it("연속 공백은 줄바꿈 하나로 합친다", () => {
    expect(breakSentences("끝.  다음")).toBe("끝.\n다음");
  });
});
