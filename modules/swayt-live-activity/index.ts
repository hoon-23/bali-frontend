import { Platform } from "react-native";
import { requireNativeModule } from "expo";

// 위젯에 그릴 화면 상태. 시각은 epoch 밀리초. 값이 없는 항목은 0(또는 null)으로 보낸다.
export type LiveActivityPhase = "waiting" | "running" | "paused" | "awaitingFinish";

export type LiveActivityState = {
  phase: LiveActivityPhase;
  isCardio: boolean;
  exerciseName: string;
  exerciseIndex: number;
  exerciseCount: number;
  setNumber: number;
  totalSets: number;
  completedSets: number;
  targetReps: number;
  targetWeight: number;
  targetMinutes: number;
  // running일 때 경과 시간의 가상 시작 시각(구간 시작 − 이미 쌓인 시간)
  timerStartMs: number | null;
  pausedSeconds: number;
  totalCompletedSets: number;
  lastUpdatedMs: number;
};

// iOS 전용. 다른 플랫폼이나 네이티브 모듈이 없는 빌드(OTA로만 받은 구버전 앱 등)에서는
// 아무 일도 하지 않고 지원 안 함으로 동작해야 한다 — 운동 기록 흐름을 막으면 안 된다.
type NativeModule = {
  isSupported(): boolean;
  start(sessionName: string, state: LiveActivityState): Promise<string>;
  update(id: string, state: LiveActivityState): Promise<void>;
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
  start: async (sessionName: string, state: LiveActivityState): Promise<string | null> =>
    native ? native.start(sessionName, state) : null,
  update: async (id: string, state: LiveActivityState): Promise<void> => {
    await native?.update(id, state);
  },
  end: async (id: string | null = null): Promise<void> => {
    await native?.end(id);
  },
  activeIds: (): string[] => native?.activeIds() ?? [],
};
