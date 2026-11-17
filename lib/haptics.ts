// 운동 중 손맛 피드백(진동). 세 곳에서만 쓴다: 세트 시작, 세트 완료, 운동 종료.
// 헬스장에서는 화면을 안 보고 누르는 일이 많아서, 눌렸다는 것을 손으로 알려 주려는 것이다.
//
// 주의: expo-haptics는 네이티브 모듈이라 앱 바이너리에 들어 있어야 한다(1.6.0부터).
// 이미 출시된 1.5.6 앱에 JS만 OTA로 보내도 이 모듈이 없으므로, 모듈을 파일 맨 위에서 import하지 않고
// 처음 쓰는 순간에 불러와 실패하면 조용히 넘어간다. 그래야 1.5.6 사용자에게 OTA가 나가도 앱이 죽지 않는다.
type HapticsModule = typeof import("expo-haptics");

let cached: HapticsModule | null | undefined;

function load(): HapticsModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("expo-haptics") as HapticsModule;
  } catch {
    cached = null;
  }
  return cached;
}

// 진동이 안 되는 기기·환경(시뮬레이터, 모듈 없음, 설정 꺼짐)에서도 호출한 쪽 흐름이 막히지 않게 모든 실패를 삼킨다.
function run(action: (haptics: HapticsModule) => Promise<void>): void {
  const haptics = load();
  if (!haptics) return;
  try {
    action(haptics).catch(() => {});
  } catch {
    // 동기 예외도 무시
  }
}

// 세트 시작: 가볍게 한 번.
export function hapticSetStart(): void {
  run((h) => h.impactAsync(h.ImpactFeedbackStyle.Light));
}

// 세트 완료: 시작보다 묵직하게 — 시작과 완료가 손으로도 구분되게 한다.
export function hapticSetComplete(): void {
  run((h) => h.impactAsync(h.ImpactFeedbackStyle.Medium));
}

// 운동 종료(서버에 완료가 저장된 뒤): 성공 패턴.
export function hapticWorkoutFinish(): void {
  run((h) => h.notificationAsync(h.NotificationFeedbackType.Success));
}
