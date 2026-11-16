// 화면에 보여줄 "완료한 세트 수". 세트는 두 가지 방법으로 완료된다 —
// 타이머로 끝내면 setTimings가 늘고, "완료한 세트" − / + 로 직접 고치면 actualSets만 바뀐다.
// 스토어(appendSetTiming)는 둘 중 큰 값을 actualSets로 유지하므로, 화면의 큰 세트 번호와 진행 칸도
// 같은 기준(둘 중 큰 값)을 써야 목록의 "3/4 세트"와 어긋나지 않는다.
export function completedSetCount(timingCount: number, actualSets: string): number {
  const entered = Number.parseInt(actualSets, 10);
  return Math.max(timingCount, Number.isFinite(entered) ? entered : 0, 0);
}
