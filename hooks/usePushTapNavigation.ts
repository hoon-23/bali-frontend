import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { markPushTapAsRead } from "./api/useNotificationInbox";
import { getInitialNotificationTap, NotificationTap, openPushTapRoute, subscribeToNotificationTaps } from "../lib/notifications";

// 푸시를 탭하면 해당 화면으로 이동한다(루틴 리마인더→예정 운동, 요약→리포트, 미실행→홈).
// 로그인된 영역((tabs) 레이아웃)에서만 마운트한다 — 로그인 전에 이동하면 인증 가드와 충돌한다.
export function usePushTapNavigation() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    // 같은 푸시를 콜드 스타트 조회와 리스너가 중복 처리하지 않게 처리한 id를 기억한다.
    const handled = new Set<string>();
    const handleTap = (tap: NotificationTap, cold = false) => {
      if (handled.has(tap.identifier)) return;
      handled.add(tap.identifier);
      // 탭한 알림은 읽음 처리하고(알림함·뱃지도 이때 최신으로 맞춘다), 화면 이동은 기다리지 않고 바로 한다.
      void markPushTapAsRead(queryClient, tap);
      openPushTapRoute(router, tap.route, { cold });
    };

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    try {
      unsubscribe = subscribeToNotificationTaps(handleTap);
      // 콜드 스타트에서는 dismissTo가 탭 전환 없이 무시되어 홈에 남는다(대기 시간과 무관) — navigate로 탭을 바꾼다.
      getInitialNotificationTap()
        .then((tap) => {
          if (!tap) return;
          if (!cancelled) handleTap(tap, true);
        })
        .catch(() => {});
    } catch (error) {
      console.warn("푸시 탭 이동 구독 실패", error);
    }
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
