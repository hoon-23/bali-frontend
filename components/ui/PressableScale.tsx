import {
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { motion } from "../../constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// 누르는 동안의 모양. 살짝만 줄여서 "눌렸다"는 것만 전하고 주변 레이아웃은 건드리지 않는다
// (transform은 레이아웃에 영향을 주지 않는다).
const PRESSED_SCALE = 0.97;
const PRESSED_OPACITY = 0.85;
const PRESS_IN_MS = 100;
const PRESS_OUT_MS = 180;

export type PressableScaleProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
};

// 앱의 모든 누를 수 있는 것의 기반. Pressable과 같은 props를 받고, 누르는 즉시 반응한다.
export function PressableScale({ style, onPressIn, onPressOut, disabled, ...rest }: PressableScaleProps) {
  const pressed = useSharedValue(0);
  // 호출하는 쪽이 준 opacity(비활성 버튼의 0.4 등)에 눌림 효과를 곱한다 —
  // 그냥 덮어쓰면 비활성 버튼이 멀쩡한 버튼처럼 보인다.
  const flatOpacity = StyleSheet.flatten(style)?.opacity;
  const baseOpacity = typeof flatOpacity === "number" ? flatOpacity : 1;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - PRESSED_SCALE) }],
    opacity: baseOpacity * (1 - pressed.value * (1 - PRESSED_OPACITY)),
  }));

  const handlePressIn = (event: GestureResponderEvent) => {
    pressed.value = withTiming(1, { duration: PRESS_IN_MS, easing: motion.easing, reduceMotion: ReduceMotion.System });
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    pressed.value = withTiming(0, { duration: PRESS_OUT_MS, easing: motion.easing, reduceMotion: ReduceMotion.System });
    onPressOut?.(event);
  };

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={disabled ? onPressIn : handlePressIn}
      onPressOut={disabled ? onPressOut : handlePressOut}
      style={[style, animatedStyle]}
    />
  );
}
