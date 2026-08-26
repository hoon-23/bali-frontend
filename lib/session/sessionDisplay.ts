export type SessionLog = {
  exerciseId: string;
  targetSets?: number | null;
  targetReps?: number | null;
  targetDurationSeconds?: number | null;
};

export type ApiSession = {
  id: string;
  date: string; // "YYYY-MM-DD"
  templateId: string | null;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
  logs: SessionLog[];
  perceivedDifficulty: number | null;
  title: string;
};

export type UpcomingCardState =
  // 오늘 세션이 하나 이상 있는 경우 — 예: 오늘 웨이트+유산소처럼 세션이 여러 개면
  // 카드도 세션 수만큼 각자의 상태로 따로 보여준다.
  | { kind: "TODAY"; sessions: ApiSession[]; next: ApiSession | null }
  | { kind: "NEXT_UPCOMING"; next: ApiSession }
  | { kind: "EMPTY" };

const TODAY_STATUS_PRIORITY: Record<ApiSession["status"], number> = {
  IN_PROGRESS: 0,
  SCHEDULED: 1,
  COMPLETED: 2,
};

export function deriveUpcomingCardState(sessions: ApiSession[], todayISODate: string): UpcomingCardState {
  // 진행 중 > 예정 > 완료 순으로 정렬 — 아직 할 일이 남은 세션을 먼저 보여준다.
  const todaySessions = sessions
    .filter((s) => s.date === todayISODate)
    .sort((a, b) => TODAY_STATUS_PRIORITY[a.status] - TODAY_STATUS_PRIORITY[b.status]);
  const future = sessions
    .filter((s) => s.date > todayISODate && s.status === "SCHEDULED")
    .sort((a, b) => a.date.localeCompare(b.date));
  const next = future[0] ?? null;

  if (todaySessions.length > 0) {
    return { kind: "TODAY", sessions: todaySessions, next };
  }
  if (next) {
    return { kind: "NEXT_UPCOMING", next };
  }
  return { kind: "EMPTY" };
}

export function estimateSessionDurationMinutes(logs: SessionLog[]): number {
  const minutes = logs.reduce((total, log) => {
    if (typeof log.targetDurationSeconds === "number") {
      return total + log.targetDurationSeconds / 60;
    }
    return total + (log.targetSets ?? 0) * 1.5;
  }, 0);
  return Math.round(minutes);
}
