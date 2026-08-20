import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";
import { ApiSession } from "../../lib/session/sessionDisplay";

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getTodayISODate(): string {
  return toISODate(new Date());
}

export function useUpcomingSessions() {
  const today = new Date();
  const future = new Date(today);
  future.setDate(future.getDate() + 30);
  const from = toISODate(today);
  const to = toISODate(future);

  return useQuery({
    queryKey: ["upcomingSessions", from, to],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSession[]>("/api/v1/sessions", { params: { from, to } });
      return data;
    },
  });
}
