import { useEffect } from "react";
import { devicePlatform, registerForPushNotificationsAsync } from "../lib/notifications";
import { useRegisterDeviceToken } from "./api/useNotifications";

// 로그인된 상태로 앱에 들어올 때마다 푸시 토큰을 발급/등록한다.
// 예전에는 "알림 설정" 화면에 들어갔을 때만 등록돼서, 그 화면을 한 번도 열지 않은 계정은
// 서버에 토큰이 없어 푸시가 가지 않았다. 서버는 token 기준 upsert라 매번 보내도 안전하다.
// 실패해도 앱 사용을 막지 않도록 조용히 로그만 남긴다(시뮬레이터는 토큰이 없어 건너뜀).
export function usePushTokenRegistration() {
  const { mutate } = useRegisterDeviceToken();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (cancelled || !token) return;
        mutate(
          { token, platform: devicePlatform },
          { onError: (error) => console.warn("푸시 토큰 등록 실패", error) }
        );
      } catch (error) {
        console.warn("푸시 토큰 발급 실패", error);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
