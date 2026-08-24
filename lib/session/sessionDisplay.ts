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
  | { kind: "IN_PROGRESS"; session: ApiSession }
  | { kind: "SCHEDULED_TODAY"; session: ApiSession }
  | { kind: "COMPLETED_TODAY"; session: ApiSession; next: ApiSession | null }
  | { kind: "NEXT_UPCOMING"; next: ApiSession }
  | { kind: "EMPTY" };

export function deriveUpcomingCardState(sessions: ApiSession[], todayISODate: string): UpcomingCardState {
  const todaySession = sessions.find((s) => s.date === todayISODate);
  const future = sessions
    .filter((s) => s.date > todayISODate && s.status === "SCHEDULED")
    .sort((a, b) => a.date.localeCompare(b.date));
  const next = future[0] ?? null;

  if (todaySession?.status === "IN_PROGRESS") {
    return { kind: "IN_PROGRESS", session: todaySession };
  }
  if (todaySession?.status === "SCHEDULED") {
    return { kind: "SCHEDULED_TODAY", session: todaySession };
  }
  if (todaySession?.status === "COMPLETED") {
    return { kind: "COMPLETED_TODAY", session: todaySession, next };
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
