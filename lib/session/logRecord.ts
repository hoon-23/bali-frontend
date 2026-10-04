// 로컬 입력 로그(문자열)와 서버 응답 로그(숫자/null)를 모두 받기 위한 최소 형태
type LogActuals = {
  actualSets: string | number | null;
  actualReps: string | number | null;
  actualDurationSeconds: string | number | null;
};

// 로그에 "기록"이 있는지 판정 — 근력은 세트 수와 횟수가 모두 0보다 클 때,
// 유산소는 수행 시간이 0보다 클 때만 기록이 있다고 본다.
// 운동 종료 흐름(강도 모달 생략)과 완료 요약 화면 제목 분기가 같은 기준을 쓴다.
export function hasLogRecord(log: LogActuals, isCardio: boolean): boolean {
  if (isCardio) return (Number(log.actualDurationSeconds) || 0) > 0;
  return (Number(log.actualSets) || 0) > 0 && (Number(log.actualReps) || 0) > 0;
}

// 기록 탭 목록용 — 종료된(COMPLETED/ABANDONED) 세션 중 기록 있는 로그가 하나도 없으면 숨긴다.
// 예정/진행 중 세션은 대상이 아니므로 항상 보인다. 운동 정보를 아직 못 불러온 로그는
// 유산소/근력 어느 쪽 기준이든 기록이 있으면 있는 것으로 봐서 목록이 깜빡이며 사라지지 않게 한다.
export function isEmptyFinishedSession(
  session: { status: string; logs: (LogActuals & { exerciseId: string })[] },
  isCardioOf: (exerciseId: string) => boolean | null
): boolean {
  if (session.status !== "COMPLETED" && session.status !== "ABANDONED") return false;
  return !session.logs.some((log) => {
    const isCardio = isCardioOf(log.exerciseId);
    if (isCardio === null) return hasLogRecord(log, true) || hasLogRecord(log, false);
    return hasLogRecord(log, isCardio);
  });
}
