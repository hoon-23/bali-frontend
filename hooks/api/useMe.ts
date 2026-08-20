import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";

export type MeResponse = {
  nickname: string;
  weeklyGoalSessions: number;
  consecutiveDays: number;
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get<MeResponse>("/api/v1/users/me");
      return data;
    },
  });
}
