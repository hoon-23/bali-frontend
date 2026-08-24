import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";
import { getTodayISODate } from "./useUpcomingSessions";

function addDaysISODate(baseISODate: string, deltaDays: number): string {
  const date = new Date(`${baseISODate}T00:00:00`);
  date.setDate(date.getDate() + deltaDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type SetTiming = {
  setIndex: number;
  startedAt: string;
  endedAt: string;
};

export type ApiSessionLogDetail = {
  id: string;
  exerciseId: string;
  sortOrder: number;
  completed: boolean;
  targetSets: number | null;
  targetReps: number | null;
  targetWeight: number | null;
  targetDurationSeconds: number | null;
  targetPace: string | null;
  actualSets: number | null;
  actualReps: number | null;
  actualWeight: number | null;
  actualDurationSeconds: number | null;
  actualPace: string | null;
  setTimings: SetTiming[] | null;
};

export type ApiSessionDetail = {
  id: string;
  date: string;
  templateId: string | null;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
  logs: ApiSessionLogDetail[];
  perceivedDifficulty: number | null;
  title: string;
};

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: ["sessions", id],
    queryFn: async () => (await apiClient.get<ApiSessionDetail>(`/api/v1/sessions/${id}`)).data,
    enabled: !!id,
    retry: false,
  });
}

export function useCreateSession() {
  return useMutation({
    mutationFn: async (payload: { date: string; templateId?: string | null }) =>
      (await apiClient.post<ApiSessionDetail>("/api/v1/sessions", payload)).data,
  });
}

export type SessionLogUpdateItem = {
  logId: string;
  exerciseId: string;
  sortOrder: number;
  targetSets?: number;
  targetReps?: number;
  targetWeight?: number;
  targetDurationSeconds?: number;
  targetPace?: string;
};

export function usePatchSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      ...payload
    }: {
      sessionId: string;
      status?: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
      perceivedDifficulty?: number;
      updateItems?: SessionLogUpdateItem[];
    }) => (await apiClient.patch<ApiSessionDetail>(`/api/v1/sessions/${sessionId}`, payload)).data,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sessions", variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ["upcomingSessions"] });
      queryClient.invalidateQueries({ queryKey: ["sessionHistory"] });
    },
  });
}

// "기록" 탭의 지난 기록 목록용 — 오늘까지의 세션을 최신순으로 반환.
// 오늘 시작했지만 아직 SCHEDULED인 세션은 templates.tsx에서 상태로 걸러내서
// "예정된 운동" 쪽과 겹치지 않게 한다(오늘 이미 완료/진행한 세션은 여기 나와야 함).
export function useSessionHistory() {
  const to = getTodayISODate();
  const from = addDaysISODate(to, -90);

  return useQuery({
    queryKey: ["sessionHistory", from, to],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSessionDetail[]>("/api/v1/sessions", {
        params: { from, to },
      });
      return data.slice().sort((a, b) => b.date.localeCompare(a.date));
    },
  });
}

export function usePatchSessionLog() {
  return useMutation({
    mutationFn: async ({
      sessionId,
      logId,
      ...payload
    }: {
      sessionId: string;
      logId: string;
      completed?: boolean;
      actualSets?: number;
      actualReps?: number;
      actualWeight?: number;
      setTimings?: SetTiming[];
    }) =>
      (
        await apiClient.patch<ApiSessionLogDetail>(
          `/api/v1/sessions/${sessionId}/logs/${logId}`,
          payload
        )
      ).data,
  });
}
