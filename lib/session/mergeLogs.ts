import type { ExerciseLog } from "../../store/workoutSessionStore";

// 앱 스토어의 기록과 위젯(잠금화면 버튼)이 바꾼 기록을 종목별로 합친다.
// 통째로 한쪽으로 덮으면 잠금화면과 앱에서 번갈아 세트를 끝냈을 때 한쪽의 세트가 사라진다.
// 세트 기록은 늘어나기만 하므로 "더 많이 진행된 쪽"을 고르면 어느 쪽도 잃지 않는다.
function progress(log: ExerciseLog): number {
  // 완료 표시가 가장 앞선 상태이고, 그다음은 끝낸 세트 수, 그다음은 진행 중 세트·유산소 누적 시간이다.
  return (
    (log.completed ? 1_000_000 : 0) +
    log.setTimings.length * 1_000 +
    (log.setStartedAt || log.durationStartedAt ? 1 : 0) +
    (Number(log.actualDurationSeconds) || 0) / 1_000_000
  );
}

export function mergeLogs(appLogs: ExerciseLog[], widgetLogs: ExerciseLog[]): ExerciseLog[] {
  const widgetById = new Map(widgetLogs.map((log) => [log.id, log]));
  const merged = appLogs.map((appLog) => {
    const widgetLog = widgetById.get(appLog.id);
    if (!widgetLog) return appLog;
    // 같으면 위젯 쪽을 쓴다 — 위젯 변경은 앱이 아직 못 본 더 새로운 것이다.
    return progress(appLog) > progress(widgetLog) ? appLog : widgetLog;
  });
  const appIds = new Set(appLogs.map((log) => log.id));
  return [...merged, ...widgetLogs.filter((log) => !appIds.has(log.id))];
}
