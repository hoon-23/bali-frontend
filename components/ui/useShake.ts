import { useCallback } from "react";
import { useAnimatedStyle, useSharedValue, withSequence, withTiming, ReduceMotion } from "react-native-reanimated";

// 입력 오류를 알릴 때 좌우로 한 번 흔들린다(200ms). 사용: const { style, shake } = useShake();
// <Animated.View style={style}> … </Animated.View>, 오류가 났을 때 shake() 호출.
// transform만 쓰므로 주변을 밀지 않는다. "동작 줄이기"가 켜져 있으면 흔들지 않는다.
const SHAKE_PX = 6;
const STEP_MS = 40;

export function useShake() {
  const offset = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  const shake = useCallback(() => {
    const step = (to: number) => withTiming(to, { duration: STEP_MS, reduceMotion: ReduceMotion.System });
    offset.value = withSequence(step(-SHAKE_PX), step(SHAKE_PX), step(-SHAKE_PX / 2), step(SHAKE_PX / 2), step(0));
  }, [offset]);
  return { style, shake };
}
