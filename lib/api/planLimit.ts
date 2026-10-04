// 무료 플랜 한도 초과 응답 처리 공용 유틸.
// 서버는 한도를 넘긴 "신규 생성/조회"에 HTTP 403 + {"error","code":"LIMIT_EXCEEDED","limit"} 를 내려준다.
// 한도 숫자는 서버 설정으로 바뀌므로 프론트는 숫자를 모르고 limit 종류만 구분한다.
// 한도가 꺼진 서버(기본)에서는 이 응답이 오지 않으므로 이 유틸이 쓰일 일이 없다.
export type PlanLimit = "TEMPLATE_COUNT" | "PERSONAL_EXERCISE_COUNT" | "MONTHLY_INSIGHTS";

const KNOWN_LIMITS: readonly PlanLimit[] = ["TEMPLATE_COUNT", "PERSONAL_EXERCISE_COUNT", "MONTHLY_INSIGHTS"];

// 에러가 LIMIT_EXCEEDED(403)면 어떤 한도인지 돌려주고, 아니면 null.
// 서버가 새 한도 종류를 추가해 모르는 limit 값이 오면 null을 돌려준다(그 경우는 호출부가 일반 오류로 처리).
export function getLimitExceeded(error: unknown): PlanLimit | null {
  const response = (error as { response?: { status?: number; data?: any } } | null | undefined)?.response;
  if (response?.status !== 403 || response.data?.code !== "LIMIT_EXCEEDED") {
    return null;
  }
  const limit = response.data?.limit;
  return KNOWN_LIMITS.includes(limit) ? (limit as PlanLimit) : null;
}

// 403 LIMIT_EXCEEDED 여부만 필요할 때(재시도 방지 등) 쓴다. 모르는 limit 값도 true.
export function isLimitExceededError(error: unknown): boolean {
  const response = (error as { response?: { status?: number; data?: any } } | null | undefined)?.response;
  return response?.status === 403 && response.data?.code === "LIMIT_EXCEEDED";
}

// 서버가 내려준 한글 메시지(error 필드)가 있으면 꺼낸다. 없으면 undefined.
export function getApiErrorMessage(error: unknown): string | undefined {
  const message = (error as { response?: { data?: { error?: unknown } } } | null | undefined)?.response?.data?.error;
  return typeof message === "string" && message.length > 0 ? message : undefined;
}

// 서버 메시지가 한글일 때만 돌려준다(영어 검증 메시지는 사용자에게 의미가 없어 기존 안내 문구를 쓴다).
export function getKoreanApiErrorMessage(error: unknown): string | undefined {
  const message = getApiErrorMessage(error);
  return message && /[가-힣]/.test(message) ? message : undefined;
}
