import { Platform } from "react-native";
import { requireNativeModule } from "expo";

// iOS 전용. 다른 플랫폼이나 네이티브 모듈이 없는 빌드(OTA로만 받은 구버전 앱 등)에서는
// 아무 일도 하지 않고 지원 안 함으로 동작해야 한다 — 운동 기록 흐름을 막으면 안 된다.
type NativeModule = {
  isSupported(): boolean;
  start(sessionName: string, exerciseName: string, setNumber: number, setStartedAtMs: number | null): Promise<string>;
  update(id: string, exerciseName: string, setNumber: number, setStartedAtMs: number | null): Promise<void>;
  end(id: string | null): Promise<void>;
  activeIds(): string[];
};

function load(): NativeModule | null {
  if (Platform.OS !== "ios") return null;
  try {
    return requireNativeModule<NativeModule>("SwaytLiveActivity");
  } catch {
    return null;
  }
}

const native = load();

export const liveActivity = {
  isSupported: (): boolean => native?.isSupported() ?? false,
  start: async (
    sessionName: string,
    exerciseName: string,
    setNumber: number,
    setStartedAtMs: number | null
  ): Promise<string | null> => (native ? native.start(sessionName, exerciseName, setNumber, setStartedAtMs) : null),
  update: async (id: string, exerciseName: string, setNumber: number, setStartedAtMs: number | null): Promise<void> => {
    await native?.update(id, exerciseName, setNumber, setStartedAtMs);
  },
  end: async (id: string | null = null): Promise<void> => {
    await native?.end(id);
  },
  activeIds: (): string[] => native?.activeIds() ?? [],
};
