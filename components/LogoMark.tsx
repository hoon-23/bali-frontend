import { useMemo } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeInUp, ReduceMotion } from "react-native-reanimated";

import { colors, motion } from "../constants/theme";

// Swayt 로고 마크: 세트를 뜻하는 둥근 막대 7개로 만든 기울어진 덤벨(assets/images/logo/swayt-mark.svg와 같은 도형).
// 흰색 = 끝낸 세트, 민트 = 지금 세트, 흰색 35% = 남은 세트 — 앱의 세트 막대와 같은 색 규칙이다.

// 단위 좌표: [x, y, 폭, 높이, 상태]. 전체 폭 68, 높이 24, -18도 기울임.
export type LogoPart = { x: number; y: number; w: number; h: number; state: "done" | "current" | "remaining" };
export const LOGO_PARTS: LogoPart[] = [
  { x: 0, y: 0, w: 6, h: 24, state: "done" },
  { x: 9, y: 0, w: 6, h: 24, state: "done" },
  { x: 18, y: 0, w: 6, h: 24, state: "done" },
  { x: 27, y: 10, w: 14, h: 4, state: "done" },
  { x: 44, y: 0, w: 6, h: 24, state: "current" },
  { x: 53, y: 0, w: 6, h: 24, state: "remaining" },
  { x: 62, y: 0, w: 6, h: 24, state: "remaining" },
];
export const LOGO_UNIT_W = 68;
export const LOGO_UNIT_H = 24;
export const LOGO_TILT_DEG = -18;
const UNIT_W = LOGO_UNIT_W;
const UNIT_H = LOGO_UNIT_H;
const TILT_DEG = LOGO_TILT_DEG;
const PARTS = LOGO_PARTS;
// 회전한 뒤의 바깥 상자(단위): 폭 = 68cos18 + 24sin18, 높이 = 68sin18 + 24cos18.
const RAD = (Math.abs(TILT_DEG) * Math.PI) / 180;
export const LOGO_BOX_W = UNIT_W * Math.cos(RAD) + UNIT_H * Math.sin(RAD);
export const LOGO_BOX_H = UNIT_W * Math.sin(RAD) + UNIT_H * Math.cos(RAD);
const BOX_W = LOGO_BOX_W;
const BOX_H = LOGO_BOX_H;

// 아래로 갈수록 한 막대씩 차례로 나타난다. 이 개수·간격 이상으로 늘리지 않는다(반복 연출은 눈만 피로하다).
const STAGGER_MS = 70;

// 마크의 세로 크기. 나타나기 전에도 같은 자리를 잡아 두려고 따로 계산해 쓴다.
export function logoMarkHeight(width: number): number {
  return (BOX_H / BOX_W) * width;
}

type LogoMarkProps = {
  // 마크의 가로 크기(px). 세로는 비율에 맞춰 정해진다.
  width: number;
  // full: 정식 색. muted: 모든 막대를 흐린 흰색으로(아직 기록이 없는 화면).
  tone?: "full" | "muted";
  // true면 처음 나타날 때 막대가 왼쪽부터 한 번씩 올라오며 쌓인다(1회, 반복 없음).
  animate?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function LogoMark({ width, tone = "full", animate = false, style }: LogoMarkProps) {
  const u = width / BOX_W; // 단위당 px
  const height = BOX_H * u;

  const parts = useMemo(
    () =>
      PARTS.map((part, index) => {
        const color =
          tone === "muted"
            ? "rgba(255, 255, 255, 0.25)"
            : part.state === "done"
              ? colors.text
              : part.state === "current"
                ? colors.accent
                : colors.remaining;
        return {
          key: index,
          color,
          style: {
            position: "absolute" as const,
            left: part.x * u,
            top: part.y * u,
            width: part.w * u,
            height: part.h * u,
            borderRadius: (Math.min(part.w, part.h) * u) / 2,
            backgroundColor: color,
          },
        };
      }),
    [u, tone]
  );

  return (
    <View
      style={[{ width, height, alignItems: "center", justifyContent: "center" }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {/* 회전은 중심을 기준으로 일어나므로, 안쪽 상자를 바깥 상자 한가운데 두고 돌린다. */}
      <View style={{ width: UNIT_W * u, height: UNIT_H * u, transform: [{ rotate: `${TILT_DEG}deg` }] }}>
        {parts.map((part, index) =>
          animate ? (
            <Animated.View
              key={part.key}
              style={part.style}
              entering={FadeInUp.duration(motion.base)
                .delay(index * STAGGER_MS)
                .withInitialValues({ opacity: 0, transform: [{ translateY: 6 * u }] })
                .reduceMotion(ReduceMotion.System)}
            />
          ) : (
            <View key={part.key} style={part.style} />
          )
        )}
      </View>
    </View>
  );
}
