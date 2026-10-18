import { useEffect } from "react";

import { startLiveActivitySync } from "../lib/session/liveActivitySync";

// 탭 레이아웃(로그인 후 화면)에서 한 번 호출해 진행 중인 운동과 Live Activity를 맞춘다.
export function useLiveActivitySync() {
  useEffect(() => startLiveActivitySync(), []);
}
