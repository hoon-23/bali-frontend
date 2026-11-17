import { hapticSetComplete, hapticSetStart, hapticWorkoutFinish } from "../haptics";

// 햅틱은 네이티브 모듈(expo-haptics)이 앱 바이너리에 있어야 동작한다. 이미 출시된 1.5.6에는 없으므로,
// 모듈이 없거나 호출이 실패해도 절대 예외가 새어 나가 운동 기록 흐름을 막으면 안 된다.
describe("haptics", () => {
  it("네이티브 모듈이 없는 환경에서도 호출이 예외를 던지지 않는다", () => {
    expect(() => hapticSetStart()).not.toThrow();
    expect(() => hapticSetComplete()).not.toThrow();
    expect(() => hapticWorkoutFinish()).not.toThrow();
  });
});
