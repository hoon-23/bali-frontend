import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  return useMutation({
    mutationFn: async (payload: { date: string; templateId?: string | null }) =>
      (await apiClient.post<ApiSessionDetail>("/api/v1/sessions", payload)).data,
  });
}

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
    }) => (await apiClient.patch<ApiSessionDetail>(`/api/v1/sessions/${sessionId}`, payload)).data,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sessions", variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ["upcomingSessions"] });
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
