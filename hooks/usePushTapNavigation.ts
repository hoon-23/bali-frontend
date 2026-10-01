import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { getInitialNotificationTap, subscribeToNotificationTaps } from "../lib/notifications";

// 푸시를 탭하면 해당 화면으로 이동한다(루틴 리마인더→예정 운동, 요약→리포트, 미실행→홈).
// 로그인된 영역((tabs) 레이아웃)에서만 마운트한다 — 로그인 전에 이동하면 인증 가드와 충돌한다.
export function usePushTapNavigation() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    // 같은 푸시를 콜드 스타트 조회와 리스너가 중복 처리하지 않게 처리한 id를 기억한다.
    const handled = new Set<string>();
    const handleTap = (tap: { identifier: string; route: string }) => {
      if (handled.has(tap.identifier)) return;
      handled.add(tap.identifier);
      // 푸시가 앱 밖에서 도착한 것이므로 알림함/뱃지도 최신으로 맞춘다.
      queryClient.invalidateQueries({ queryKey: ["notificationInbox"] });
      queryClient.invalidateQueries({ queryKey: ["notificationUnreadCount"] });
      router.push(tap.route as never);
    };

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToNotificationTaps(handleTap);
      getInitialNotificationTap().then((tap) => tap && handleTap(tap)).catch(() => {});
    } catch (error) {
      console.warn("푸시 탭 이동 구독 실패", error);
    }
    return () => unsubscribe?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
