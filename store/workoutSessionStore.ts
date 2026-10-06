import { create } from "zustand";

import type { SessionXpResult } from "../hooks/api/useSessions";
import { clearScheduledOrigin, saveScheduledOrigin } from "../lib/session/scheduledOrigin";

export type SetTiming = {
  setIndex: number;
  startedAt: string;
  endedAt: string;
};

export type ExerciseLog = {
  id: string;
  exerciseId: string;
  name: string;
  sortOrder: number;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  targetDurationSeconds: number;
  actualSets: string;
  actualReps: string;
  actualWeight: string;
  actualDurationSeconds: string;
  completed: boolean;
  setTimings: SetTiming[];
  // 유산소 타이머가 흐르는 중이면 이번 구간의 시작 시각(ISO), 멈춰 있으면 null.
  // 화면을 닫았다 열어도(컴포넌트 언마운트) 이어서 흐르도록 스토어에 둔다.
  durationStartedAt: string | null;
  // 세트 타이머로 진행 중인 세트의 시작 시각(ISO), 진행 중인 세트가 없으면 null.
  setStartedAt: string | null;
  // 진행 중 세트의 "세트 완료 깜빡함" 리마인드 알림 id. 화면을 닫았다 열어도 "세트 완료"/정산 때
  // 취소할 수 있도록 스토어에 둔다. 알림이 없거나 예약에 실패했으면 null.
  setReminderId: string | null;
};

// 진행 중 구간의 경과 초 — 화면 표시와 정산이 모두 이 함수 하나로 계산한다(이중 계산 방지).
export function runningElapsedSeconds(startedAt: string | null, nowMs: number): number {
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((nowMs - Date.parse(startedAt)) / 1000));
}

// 세트 하나를 기록에 붙이고 진행 중 세트 표시를 해제한다.
function appendSetTiming(log: ExerciseLog, timing: SetTiming): ExerciseLog {
  return {
    ...log,
    setTimings: [...log.setTimings, timing],
    // 타이머로 세트를 완료한 개수는 항상 실제 완료 수만큼 반영한다 — 스테퍼로
    // 수동 조정한 값이 이보다 크면 그 값을 유지하고, 작으면 완료 수까지 끌어올린다.
    actualSets: String(Math.max(Number(log.actualSets) || 0, log.setTimings.length + 1)),
    setStartedAt: null,
    // 세트가 끝났으니 알림 id도 비운다(실제 취소는 호출부가 비우기 전에 읽어서 처리).
    setReminderId: null,
  };
}

// 흐르던 유산소 구간을 누적 시간(actualDurationSeconds)에 더하고 타이머를 멈춘다.
function settleDuration(log: ExerciseLog, nowMs: number): ExerciseLog {
  if (!log.durationStartedAt) return log;
  const total = (Number(log.actualDurationSeconds) || 0) + runningElapsedSeconds(log.durationStartedAt, nowMs);
  return { ...log, actualDurationSeconds: String(total), durationStartedAt: null };
}

// 흐르던 타이머를 모두 정산한 로그 — 유산소 구간은 누적 시간에, 진행 중 세트는 완료 세트로 기록한다.
// 서버 전송/완료/종료 직전에 써서 흐르던 시간이 빠지지 않게 한다.
export function settleRunningTimers(log: ExerciseLog, nowMs: number): ExerciseLog {
  const next = settleDuration(log, nowMs);
  if (!next.setStartedAt) return next;
  return appendSetTiming(next, {
    setIndex: next.setTimings.length,
    startedAt: next.setStartedAt,
    endedAt: new Date(nowMs).toISOString(),
  });
}

export type ActualField = "actualSets" | "actualReps" | "actualWeight" | "actualDurationSeconds";

type WorkoutSessionState = {
  sessionId: string | null;
  isRealSession: boolean;
  logs: ExerciseLog[];
  expandedId: string | null;
  // 운동 완료 응답의 경험치 결과 — 완료 화면(summary)이 읽는다. 실제 세션이 아니거나 못 받았으면 null.
  xpResult: SessionXpResult | null;
  // 예정된 운동 화면에서 시작한 세션의 id(즉흥 시작이면 null) — 빈 세션 종료 시 예약 유지 판단용.
  scheduledOriginSessionId: string | null;
  markScheduledOrigin: (sessionId: string) => void;
  setXpResult: (xp: SessionXpResult | null) => void;
  startSession: (sessionId: string, logs: ExerciseLog[], isRealSession: boolean) => void;
  appendLogs: (newLogs: ExerciseLog[]) => void;
  setExpandedId: (id: string | null) => void;
  updateField: (id: string, field: ActualField, value: string) => void;
  adjustActualSets: (id: string, delta: number) => void;
  setTargetSets: (id: string, targetSets: number) => void;
  recordSetTiming: (logId: string, timing: SetTiming) => void;
  startDuration: (logId: string) => void;
  stopDuration: (logId: string) => void;
  startSet: (logId: string) => void;
  // 예약된 리마인드 알림 id를 저장한다 — 이미 세트가 끝난 로그에는 저장하지 않고 false를 돌려준다.
  setSetReminderId: (logId: string, reminderId: string) => boolean;
  settleLogTimers: (logId: string) => void;
  settleAllTimers: () => void;
  completeLog: (id: string) => void;
  uncompleteLog: (id: string) => void;
  endSession: () => void;
};

export const useWorkoutSessionStore = create<WorkoutSessionState>((set, get) => ({
  sessionId: null,
  isRealSession: false,
  logs: [],
  expandedId: null,
  xpResult: null,
  scheduledOriginSessionId: null,

  markScheduledOrigin: (sessionId) => {
    // 앱이 재시작돼도 판별이 유지되도록 별도로 영속 저장한다.
    saveScheduledOrigin(sessionId);
    set({ scheduledOriginSessionId: sessionId });
  },

  setXpResult: (xp) => set({ xpResult: xp }),

  startSession: (sessionId, logs, isRealSession) =>
    set({
      sessionId,
      isRealSession,
      logs,
      expandedId: logs.find((log) => !log.completed)?.id ?? null,
    }),

  appendLogs: (newLogs) =>
    set((state) => ({ logs: [...state.logs, ...newLogs] })),

  setExpandedId: (id) =>
    set((state) => ({ expandedId: state.expandedId === id ? null : id })),

  updateField: (id, field, value) =>
    set((state) => ({
      logs: state.logs.map((log) => (log.id === id ? { ...log, [field]: value } : log)),
    })),

  adjustActualSets: (id, delta) =>
    set((state) => ({
      logs: state.logs.map((log) =>
        log.id === id
          ? {
              ...log,
              actualSets: String(Math.max(0, (Number(log.actualSets) || 0) + delta)),
            }
          : log
      ),
    })),

  setTargetSets: (id, targetSets) =>
    set((state) => ({
      logs: state.logs.map((log) => (log.id === id ? { ...log, targetSets } : log)),
    })),

  recordSetTiming: (logId, timing) =>
    set((state) => ({
      logs: state.logs.map((log) => (log.id === logId ? appendSetTiming(log, timing) : log)),
    })),

  // 이미 흐르는 중이면 시작 시각을 덮어쓰지 않는다(중복 탭 대비).
  startDuration: (logId) =>
    set((state) => ({
      logs: state.logs.map((log) =>
        log.id === logId && !log.durationStartedAt
          ? { ...log, durationStartedAt: new Date().toISOString() }
          : log
      ),
    })),

  stopDuration: (logId) => {
    const nowMs = Date.now();
    set((state) => ({
      logs: state.logs.map((log) => (log.id === logId ? settleDuration(log, nowMs) : log)),
    }));
  },

  startSet: (logId) =>
    set((state) => ({
      logs: state.logs.map((log) =>
        log.id === logId && !log.setStartedAt ? { ...log, setStartedAt: new Date().toISOString() } : log
      ),
    })),

  setSetReminderId: (logId, reminderId) => {
    const target = get().logs.find((log) => log.id === logId);
    // 알림 예약은 비동기라, 그 사이 세트가 끝났다면 id를 남기지 않는다(호출부가 바로 취소).
    if (!target?.setStartedAt) return false;
    set((state) => ({
      logs: state.logs.map((log) => (log.id === logId ? { ...log, setReminderId: reminderId } : log)),
    }));
    return true;
  },

  settleLogTimers: (logId) => {
    const nowMs = Date.now();
    set((state) => ({
      logs: state.logs.map((log) => (log.id === logId ? settleRunningTimers(log, nowMs) : log)),
    }));
  },

  settleAllTimers: () => {
    const nowMs = Date.now();
    set((state) => ({ logs: state.logs.map((log) => settleRunningTimers(log, nowMs)) }));
  },

  completeLog: (id) => {
    const updatedLogs = get().logs.map((log) =>
      log.id === id ? { ...log, completed: true } : log,
    );
    const completedIndex = updatedLogs.findIndex((log) => log.id === id);
    const nextIncomplete = updatedLogs
      .slice(completedIndex + 1)
      .find((log) => !log.completed);
    set({ logs: updatedLogs, expandedId: nextIncomplete?.id ?? null });
  },

  // 완료 취소(이어서 하기) — 기록은 그대로 두고 completed만 해제한 뒤 해당 종목을 펼친다.
  uncompleteLog: (id) =>
    set((state) => ({
      logs: state.logs.map((log) => (log.id === id ? { ...log, completed: false } : log)),
      expandedId: id,
    })),

  endSession: () => {
    clearScheduledOrigin();
    set({ sessionId: null, isRealSession: false, logs: [], expandedId: null, xpResult: null, scheduledOriginSessionId: null });
  },
}));
