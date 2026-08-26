import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";

export type NotificationSettings = {
  routineReminderEnabled: boolean;
  inactivityAlertEnabled: boolean;
  summaryNotificationEnabled: boolean;
};

export function useNotificationSettings() {
  return useQuery({
    queryKey: ["notification-settings"],
    queryFn: async () => {
      const { data } = await apiClient.get<NotificationSettings>("/api/v1/notifications/settings");
      return data;
    },
  });
}

// 세 필드 모두 optional — 보내지 않은 필드는 서버가 기존 값을 유지한다
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<NotificationSettings>) =>
      (await apiClient.patch<NotificationSettings>("/api/v1/notifications/settings", payload)).data,
    onSuccess: (data) => {
      queryClient.setQueryData(["notification-settings"], data);
    },
  });
}

export type DevicePlatform = "IOS" | "ANDROID";

// token 기준 upsert라 이미 등록된 토큰을 다시 보내도 안전하다
export function useRegisterDeviceToken() {
  return useMutation({
    mutationFn: async (payload: { token: string; platform: DevicePlatform }) => {
      await apiClient.post("/api/v1/notifications/device-token", payload);
    },
  });
}

// 로그아웃/회원탈퇴 시 본인 소유 토큰만 제거된다
export function useUnregisterDeviceToken() {
  return useMutation({
    mutationFn: async (payload: { token: string }) => {
      await apiClient.delete("/api/v1/notifications/device-token", { data: payload });
    },
  });
}
