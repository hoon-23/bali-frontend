import { useEffect } from "react";
import { AppState } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";

// bali-api의 NotificationType enum을 그대로 따름.
export type InboxNotificationType = "ROUTINE_REMINDER" | "INACTIVITY_ALERT" | "WEEKLY_SUMMARY" | "MONTHLY_SUMMARY";

export type InboxNotification = {
  id: string;
  type: InboxNotificationType;
  title: string;
  body: string;
  referenceId: string | null;
  sentAt: string;
  read: boolean;
};

const INBOX_PAGE_SIZE = 50;
const INBOX_KEY = ["notificationInbox"];
const UNREAD_KEY = ["notificationUnreadCount"];

// 서버가 보낸 푸시 목록 — 최근 30일, sentAt 내림차순. 서버가 size를 최대 50으로 보정한다.
// 이번 범위에서는 첫 페이지만 보여준다(30일치라 대부분 한 페이지에 들어온다).
export type InboxPage = {
  items: InboxNotification[];
  page: number;
  size: number;
  totalElements: number;
  hasNext: boolean;
};

export function useNotificationInbox() {
  return useQuery({
    queryKey: INBOX_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<InboxPage>("/api/v1/notifications", {
        params: { page: 0, size: INBOX_PAGE_SIZE },
      });
      return data.items;
    },
  });
}

// 안 읽은 알림 개수 — 앱이 포그라운드로 돌아올 때마다 다시 가져온다(푸시가 앱 밖에서 도착하므로).
// 실패하면 0으로 취급해 뱃지를 숨긴다.
export function useUnreadNotificationCount(): number {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: UNREAD_KEY,
    retry: false,
    queryFn: async () => {
      const { data: response } = await apiClient.get<{ count: number }>("/api/v1/notifications/unread-count");
      return response.count;
    },
  });

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") queryClient.invalidateQueries({ queryKey: UNREAD_KEY });
    });
    return () => subscription.remove();
  }, [queryClient]);

  return data ?? 0;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/api/v1/notifications/${id}/read`);
    },
    // 화면은 즉시 읽음 처리하고, 서버 응답 후 목록/개수를 다시 맞춘다.
    onMutate: async (id) => {
      queryClient.setQueryData<InboxNotification[]>(INBOX_KEY, (list) =>
        list?.map((item) => (item.id === id ? { ...item, read: true } : item))
      );
      queryClient.setQueryData<number>(UNREAD_KEY, (count) => Math.max(0, (count ?? 0) - 1));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: INBOX_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_KEY });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.post("/api/v1/notifications/read-all");
    },
    onMutate: async () => {
      queryClient.setQueryData<InboxNotification[]>(INBOX_KEY, (list) =>
        list?.map((item) => ({ ...item, read: true }))
      );
      queryClient.setQueryData<number>(UNREAD_KEY, 0);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: INBOX_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_KEY });
    },
  });
}
