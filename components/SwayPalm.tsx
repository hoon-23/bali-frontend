import { useEffect } from "react";
import { type ImageStyle, type StyleProp } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// 야자수 원본 이미지의 가로:세로 비율(417×1024).
const PALM_ASPECT = 417 / 1024;

// 흔들림 한 번: 오른쪽으로 크게 → 왼쪽으로 조금 → 오른쪽으로 살짝 → 제자리. 합쳐서 1.5초.
// 바람에 한 번 흔들리고 멈추는 모양이라 진폭이 점점 줄어든다.
const SWAY_STEPS: { degrees: number; duration: number }[] = [
  { degrees: 7, duration: 330 },
  { degrees: -4, duration: 390 },
  { degrees: 2, duration: 360 },
  { degrees: 0, duration: 420 },
];

type SwayPalmProps = {
  // 세로 크기(px). 가로는 비율에 맞춰 정해진다.
  height: number;
  // accent: 민트(방금 해낸 것), muted: 흐린 흰색(아직 기록이 없는 빈 화면).
  tone?: "accent" | "muted";
  // true가 되는 순간 한 번 흔들린다. 반복하지 않는다 — 계속 움직이면 장식이 되어 눈만 피로하다.
  sway?: boolean;
  style?: StyleProp<ImageStyle>;
};

// Swayt 로고의 야자수. 앱 이름(sway)에서 온 "흔들림"을 운동을 끝낸 순간에 한 번 보여주는 데 쓴다.
export function SwayPalm({ height, tone = "accent", sway = false, style }: SwayPalmProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (!sway) return;
    rotation.value = withSequence(
      ...SWAY_STEPS.map(({ degrees, duration }) =>
        // "동작 줄이기"가 켜져 있으면 흔들지 않고 그대로 둔다.
        withTiming(degrees, { duration, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.System })
      )
    );
  }, [sway, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.Image
      source={
        tone === "accent"
          ? require("../assets/images/logo/swayt-palm.png")
          : require("../assets/images/logo/swayt-palm-white.png")
      }
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        {
          height,
          width: height * PALM_ASPECT,
          // 줄기 밑동을 축으로 흔들린다.
          transformOrigin: "50% 100%",
          opacity: tone === "muted" ? 0.3 : 1,
        },
        style,
        animatedStyle,
      ]}
    />
  );
}
