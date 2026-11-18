import * as SecureStore from "expo-secure-store";

const REFRESH_TOKEN_KEY = "swayt-refresh-token";

// 기본값(잠금 해제 중에만 읽기)이면 잠금화면 버튼 등으로 기기가 잠긴 채 앱 프로세스가 먼저 뜰 때
// 토큰을 못 읽어 로그아웃된 것처럼 시작한다. 첫 잠금 해제 이후에는 읽을 수 있게 한다.
// 기존에 저장된 값은 다음 토큰 갱신 때 setItem으로 다시 쓰이면서 이 설정으로 바뀐다.
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY, OPTIONS);
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, OPTIONS);
}

export async function clearRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, OPTIONS);
}
