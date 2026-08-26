import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";

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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { date: string; templateId?: string | null }) =>
      (await apiClient.post<ApiSessionDetail>("/api/v1/sessions", payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcomingSessions"] });
      queryClient.invalidateQueries({ queryKey: ["sessionHistory"] });
    },
  });
}

// 세션 삭제 — 예정된(SCHEDULED) 운동 예약 취소용
export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await apiClient.delete(`/api/v1/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcomingSessions"] });
      queryClient.invalidateQueries({ queryKey: ["sessionHistory"] });
    },
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

export type SessionHistoryPage = {
  content: ApiSessionDetail[];
  hasNext: boolean;
  nextCursor: string | null;
};

const SESSION_HISTORY_PAGE_SIZE = 20;

// "기록" 탭의 지난 기록 목록용 — 커서 기반 무한스크롤(date DESC, 동일 date는 id DESC).
// 오늘 시작했지만 아직 SCHEDULED인 세션은 templates.tsx에서 상태로 걸러내서
// "예정된 운동" 쪽과 겹치지 않게 한다(오늘 이미 완료/진행한 세션은 여기 나와야 함).
export function useSessionHistory() {
  return useInfiniteQuery({
    queryKey: ["sessionHistory"],
    queryFn: async ({ pageParam }) => {
      const { data } = await apiClient.get<SessionHistoryPage>("/api/v1/sessions", {
        params: { size: SESSION_HISTORY_PAGE_SIZE, cursor: pageParam },
      });
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.nextCursor ?? undefined : undefined),
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
