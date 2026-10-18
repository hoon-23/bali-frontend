import { isAxiosError } from "axios";
import { useEffect } from "react";

import type { ApiSessionDetail } from "./api/useSessions";
import { apiClient } from "../lib/api/client";
import { useWorkoutSessionStore } from "../store/workoutSessionStore";

// 앱 재시작으로 복원된 진행 중 세션이 서버에서도 아직 진행 중인지 확인한다.
// 다른 기기에서 끝냈거나, 요약 화면에서 종료되기 전에 앱이 꺼졌거나, 계정이 바뀐 경우에
// 오래된 기록이 남아 새 운동 시작을 막지 않도록 정리한다.
// 네트워크 오류처럼 판단할 수 없을 때는 지우지 않는다(운동 기록을 잃는 쪽이 더 나쁘다).
async function verifyRestoredSession(): Promise<void> {
  const { sessionId, isRealSession, endSession } = useWorkoutSessionStore.getState();
  // 실제 세션이 아닌 폴백 기록은 서버에 없으니 확인 대상이 아니다.
  if (!sessionId || !isRealSession) return;
  try {
    const { data } = await apiClient.get<ApiSessionDetail>(`/api/v1/sessions/${sessionId}`);
    if (data.status !== "IN_PROGRESS" && useWorkoutSessionStore.getState().sessionId === sessionId) {
      endSession();
    }
  } catch (error) {
    const status = isAxiosError(error) ? error.response?.status : undefined;
    if ((status === 403 || status === 404) && useWorkoutSessionStore.getState().sessionId === sessionId) {
      endSession();
    }
  }
}

// 탭 레이아웃(로그인 후 화면)에서 한 번만 호출한다. 부팅 흐름(_layout.tsx)과 분리하기 위해
// 저장소 복원이 끝난 뒤에 실행한다.
export function useRestoredSessionGuard() {
  useEffect(() => {
    const { persist } = useWorkoutSessionStore;
    if (persist.hasHydrated()) {
      void verifyRestoredSession();
      return;
    }
    return persist.onFinishHydration(() => {
      void verifyRestoredSession();
    });
  }, []);
}
