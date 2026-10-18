import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import type { StateStorage } from "zustand/middleware";

// 진행 중 운동 상태를 디스크에 쓰는 저장소. 입력란 타이핑처럼 잦은 변경은 마지막 값만 모아서 쓰고,
// 앱이 백그라운드로 가는 순간에는 대기 중인 값을 즉시 쓴다(그 직후 강제 종료돼도 마지막 상태가 남도록).
// 타이머는 시각(ISO)만 저장하고 틱마다 쓰지 않으므로 이 경로로 들어오는 쓰기는 사용자 조작 시점뿐이다.
// 저장소 접근 실패는 모두 무시한다 — 저장이 안 돼도 메모리 상태로 운동은 계속된다.
const WRITE_DELAY_MS = 400;

let pending: { name: string; value: string } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

async function flushPending(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!pending) return;
  const { name, value } = pending;
  pending = null;
  try {
    await AsyncStorage.setItem(name, value);
  } catch {
    // 무시
  }
}

AppState.addEventListener("change", (next) => {
  if (next !== "active") void flushPending();
});

export const sessionPersistStorage: StateStorage = {
  getItem: async (name) => {
    try {
      return await AsyncStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    pending = { name, value };
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void flushPending(), WRITE_DELAY_MS);
  },
  removeItem: async (name) => {
    // 대기 중이던 쓰기가 삭제 뒤에 되살아나지 않게 먼저 버린다.
    pending = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      // 무시
    }
  },
};
