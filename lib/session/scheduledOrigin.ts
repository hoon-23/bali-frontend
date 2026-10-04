import AsyncStorage from "@react-native-async-storage/async-storage";

// "예정된 운동 화면에서 시작한 세션 id"를 앱 재시작 후에도 복구하기 위한 최소 영속 저장.
// 서버 응답엔 예약 출신 정보가 없어서 프론트가 시작 경로로 기록한다. 진행 중 운동 상태 전체는
// 영속 저장하지 않으므로 이 값만 따로 보관한다. 저장소 접근 실패는 모두 무시한다
// (값이 없으면 즉흥 시작으로 간주 — 빈 세션 종료 시 안전하게 삭제 쪽으로 처리됨).
const KEY = "scheduledOriginSessionId";

export async function saveScheduledOrigin(sessionId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, sessionId);
  } catch {
    // 무시
  }
}

export async function loadScheduledOrigin(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function clearScheduledOrigin(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}
