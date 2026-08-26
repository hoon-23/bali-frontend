import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";

export type MeResponse = {
  nickname: string;
  email: string;
  weeklyGoalSessions: number;
  consecutiveDays: number;
};

// 소셜 로그인 provider가 이메일을 안 준 경우 백엔드가 채워 넣는 내부 placeholder
// ("{providerId}@{provider}.bali.internal") — email 컬럼 NOT NULL 제약 때문에 생기는
// 마커일 뿐 실제 이메일이 아니라서 화면에 그대로 보여주면 안 된다.
export function isPlaceholderEmail(email: string): boolean {
  return email.endsWith(".bali.internal");
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get<MeResponse>("/api/v1/users/me");
      return data;
    },
  });
}

// 닉네임(1~20자)/주간 목표 운동 횟수(1~7)를 부분 수정 — 둘 다 optional, null이면 기존 값 유지 (백엔드 User.updateProfile 규칙과 동일)
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { nickname?: string; weeklyGoalSessions?: number }) =>
      (await apiClient.patch<MeResponse>("/api/v1/users/me", payload)).data,
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data);
    },
  });
}

// 회원 탈퇴 — 서버가 이메일/닉네임 등 개인정보를 즉시 파기하므로 되돌릴 수 없다
export function useWithdraw() {
  return useMutation({
    mutationFn: async () => {
      await apiClient.delete("/api/v1/users/me");
    },
  });
}
