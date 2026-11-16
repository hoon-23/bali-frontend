import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { FadeInUp, ReduceMotion } from "react-native-reanimated";

import { motion } from "../../constants/theme";

// 목록이 아무리 길어도 이 개수까지만 차례로 나타나게 한다 — 그 뒤는 지연 없이 바로 보여서 기다리지 않는다.
const MAX_STAGGERED = 5;
const STAGGER_MS = 50;
const RISE_PX = 8;

type RevealProps = {
  children: ReactNode;
  // 몇 번째로 나타나는지(0부터). MAX_STAGGERED를 넘으면 지연이 늘지 않는다.
  index?: number;
  style?: StyleProp<ViewStyle>;
};

// 화면에 처음 나타날 때 8px 아래에서 올라오며 나타난다(200ms). 자리는 처음부터 잡혀 있어 주변을 밀지 않는다.
// "동작 줄이기"가 켜져 있으면 움직임 없이 바로 보인다.
export function Reveal({ children, index = 0, style }: RevealProps) {
  const delay = Math.min(index, MAX_STAGGERED) * STAGGER_MS;
  return (
    <Animated.View
      style={style}
      entering={FadeInUp.duration(motion.base)
        .delay(delay)
        .withInitialValues({ opacity: 0, transform: [{ translateY: RISE_PX }] })
        .reduceMotion(ReduceMotion.System)}
    >
      {children}
    </Animated.View>
  );
}
