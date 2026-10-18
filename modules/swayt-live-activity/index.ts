import { Platform } from "react-native";
import { requireNativeModule } from "expo";

// iOS 전용. 다른 플랫폼이나 네이티브 모듈이 없는 빌드(OTA로만 받은 구버전 앱 등)에서는
// 아무 일도 하지 않고 지원 안 함으로 동작해야 한다 — 운동 기록 흐름을 막으면 안 된다.
type NativeModule = {
  isSupported(): boolean;
  syncPlan(planJson: string | null): Promise<void>;
  readPlan(): string | null;
  activeIds(): string[];
  readDebugLog(): string[];
  clearDebugLog(): void;
  appendDebugLog(message: string): void;
  debugPerform(action: string): Promise<void>;
  addListener(eventName: "onPlanChanged", listener: () => void): { remove(): void };
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
  // 진행 중 운동의 plan(JSON 문자열)을 보낸다. null이면 진행 중인 운동이 없다는 뜻(남은 Live Activity를 끈다).
  syncPlan: async (planJson: string | null): Promise<void> => {
    await native?.syncPlan(planJson);
  },
  readPlan: (): string | null => native?.readPlan() ?? null,
  activeIds: (): string[] => native?.activeIds() ?? [],
  readDebugLog: (): string[] => native?.readDebugLog() ?? [],
  clearDebugLog: (): void => native?.clearDebugLog(),
  appendDebugLog: (message: string): void => native?.appendDebugLog(message),
  // 버튼 탭이 실행하는 것과 같은 코드를 앱 안에서 직접 부른다(진단용).
  debugPerform: async (action: string): Promise<void> => {
    await native?.debugPerform(action);
  },
  // 위젯 버튼이 plan을 바꿨을 때(앱이 살아 있는 동안) 호출된다. 해제 함수를 돌려준다.
  onPlanChanged: (listener: () => void): (() => void) => {
    const subscription = native?.addListener("onPlanChanged", listener);
    return () => subscription?.remove();
  },
};
