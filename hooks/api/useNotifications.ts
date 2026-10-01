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
    // 낙관적 업데이트 — 서버 응답을 기다리지 않고 스위치를 먼저 반영하고, 실패하면 되돌린다
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["notification-settings"] });
      const previous = queryClient.getQueryData<NotificationSettings>(["notification-settings"]);
      if (previous) {
        queryClient.setQueryData<NotificationSettings>(["notification-settings"], { ...previous, ...payload });
      }
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notification-settings"], context.previous);
      }
    },
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
