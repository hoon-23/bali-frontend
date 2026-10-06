import { useEffect } from "react";
import { type DimensionValue, type StyleProp, StyleSheet, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// 스켈레톤 깜빡임의 속도·밝기 범위는 여기서만 관리한다.
const PULSE_DURATION_MS = 900;
const PULSE_MIN_OPACITY = 0.45;
const PULSE_MAX_OPACITY = 1;

type SkeletonProps = {
  // 너비. 숫자(px) 또는 "60%" 같은 비율. 생략하면 부모 너비를 꽉 채운다.
  width?: DimensionValue;
  // 높이(px). 실제 콘텐츠와 같은 높이를 넘겨 데이터가 와도 레이아웃이 흔들리지 않게 한다.
  height: number;
  // 모서리 둥글기. 생략하면 높이에 맞춰 자연스러운 값(최대 8)을 쓴다.
  radius?: number;
  // 여백(marginVertical 등)이나 위치 보정용 추가 스타일.
  style?: StyleProp<ViewStyle>;
};

// 데이터가 처음 도착하기 전, 실제 콘텐츠 자리에 같은 크기로 그려 두는 자리표시 막대.
// 불투명도를 천천히 오르내리며 "불러오는 중"임을 알리고, 동작 줄이기 설정이 켜져 있으면 멈춘 채로 둔다.
export function Skeleton({ width = "100%", height, radius, style }: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(PULSE_MAX_OPACITY);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = PULSE_MAX_OPACITY;
      return;
    }
    opacity.value = withRepeat(
      withTiming(PULSE_MIN_OPACITY, {
        duration: PULSE_DURATION_MS,
        easing: Easing.inOut(Easing.ease),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
      undefined,
      ReduceMotion.System,
    );
    return () => cancelAnimation(opacity);
  }, [reduceMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      // 스크린리더가 빈 막대를 읽지 않게 숨긴다.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.base,
        { width, height, borderRadius: radius ?? Math.min(8, height / 2) },
        style,
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  // 어두운 카드 배경(#1C1C25) 위에서 은은하게 보이는 밝기.
  base: {
    backgroundColor: "rgba(255, 255, 255, 0.09)",
  },
});
