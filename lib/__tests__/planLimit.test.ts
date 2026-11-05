import {
  getApiErrorMessage,
  getKoreanApiErrorMessage,
  getLimitExceeded,
  isLimitExceededError,
} from "../api/planLimit";

const apiError = (status: number, data: unknown) => ({ response: { status, data } });

describe("getLimitExceeded", () => {
  it("403 LIMIT_EXCEEDED의 한도 종류를 돌려준다", () => {
    const error = apiError(403, { code: "LIMIT_EXCEEDED", limit: "TEMPLATE_COUNT" });
    expect(getLimitExceeded(error)).toBe("TEMPLATE_COUNT");
  });

  it("서버가 새로 추가한 모르는 한도 종류는 null", () => {
    const error = apiError(403, { code: "LIMIT_EXCEEDED", limit: "SOMETHING_NEW" });
    expect(getLimitExceeded(error)).toBeNull();
  });

  it("다른 상태 코드나 다른 코드는 null", () => {
    expect(getLimitExceeded(apiError(500, { code: "LIMIT_EXCEEDED", limit: "TEMPLATE_COUNT" }))).toBeNull();
    expect(getLimitExceeded(apiError(403, { code: "FORBIDDEN" }))).toBeNull();
  });

  it("응답이 없는 에러(네트워크 오류 등)나 null/undefined는 null", () => {
    expect(getLimitExceeded(new Error("Network Error"))).toBeNull();
    expect(getLimitExceeded(null)).toBeNull();
    expect(getLimitExceeded(undefined)).toBeNull();
  });
});

describe("isLimitExceededError", () => {
  it("모르는 한도 종류여도 403 LIMIT_EXCEEDED면 true", () => {
    expect(isLimitExceededError(apiError(403, { code: "LIMIT_EXCEEDED", limit: "SOMETHING_NEW" }))).toBe(true);
  });

  it("그 외에는 false", () => {
    expect(isLimitExceededError(apiError(403, { code: "FORBIDDEN" }))).toBe(false);
    expect(isLimitExceededError(null)).toBe(false);
  });
});

describe("getApiErrorMessage", () => {
  it("error 필드의 문자열을 꺼낸다", () => {
    expect(getApiErrorMessage(apiError(400, { error: "잘못된 요청입니다" }))).toBe("잘못된 요청입니다");
  });

  it("없거나 빈 문자열이거나 문자열이 아니면 undefined", () => {
    expect(getApiErrorMessage(apiError(400, {}))).toBeUndefined();
    expect(getApiErrorMessage(apiError(400, { error: "" }))).toBeUndefined();
    expect(getApiErrorMessage(apiError(400, { error: 123 }))).toBeUndefined();
    expect(getApiErrorMessage(null)).toBeUndefined();
  });
});

describe("getKoreanApiErrorMessage", () => {
  it("한글이 들어 있는 메시지만 돌려준다", () => {
    expect(getKoreanApiErrorMessage(apiError(400, { error: "닉네임이 너무 깁니다" }))).toBe("닉네임이 너무 깁니다");
    expect(getKoreanApiErrorMessage(apiError(400, { error: "must not be blank" }))).toBeUndefined();
  });
});
