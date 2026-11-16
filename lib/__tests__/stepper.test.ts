import { stepReps, stepWeight } from "../format/stepper";

describe("stepWeight", () => {
  it.each([
    ["60", 1, "62.5"],
    ["62.5", 1, "65"],
    ["60", -1, "57.5"],
    ["", 1, "2.5"],
    ["", -1, "0"],
    ["12.", 1, "14.5"],
    ["0", -1, "0"],
    ["1", -1, "0"],
    ["999", 1, "999.9"],
    ["61.3", 1, "63.8"],
  ])("%s %d -> %s", (value, direction, expected) => {
    expect(stepWeight(value, direction as 1 | -1)).toBe(expected);
  });
});

describe("stepReps", () => {
  it.each([
    ["10", 1, "11"],
    ["10", -1, "9"],
    ["0", -1, "0"],
    ["", 1, "1"],
    ["999", 1, "999"],
  ])("%s %d -> %s", (value, direction, expected) => {
    expect(stepReps(value, direction as 1 | -1)).toBe(expected);
  });
});
