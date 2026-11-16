import type { TextStyle } from "react-native";
import { Easing } from "react-native-reanimated";

// 앱 전체의 색·글자·둥글기·간격·움직임 값. 화면 파일에는 이 값만 쓰고 hex나 숫자를 직접 적지 않는다.
// 규칙의 배경은 docs/specs/2026-11-16-ux-전면개선-design.md 참고.

export const colors = {
  bg: "#0B0B0F",
  // 입력 상자, 탭바, 조용한 버튼
  surface: "#16161C",
  // 시트, 모달
  surfaceRaised: "#1C1C25",
  line: "rgba(255, 255, 255, 0.08)",
  // 남은 세트 칸, 막대의 빈 부분
  track: "rgba(255, 255, 255, 0.12)",
  text: "#FFFFFF",
  text2: "#A0A0A0",
  // 메타·캡션. 예전 #6B6B6B는 배경 대비가 약 3.7:1이라 작은 글씨가 안 읽혀서 올렸다.
  text3: "#8A8A94",
  // 민트는 "살아 있는 것"에만 쓴다: 화면의 주 버튼 하나, 흐르는 타이머,
  // 진행 중인 세트 칸·진행 중 배너, 방금 얻은 것. 그 밖에는 흰색과 회색으로 구분한다.
  accent: "#2DD4BF",
  onAccent: "#0B0B0F",
  danger: "#F87171",
  warn: "#FBBF24",
} as const;

// 글자는 이 7단계만 쓴다. 굵기는 400/600/800 셋뿐이다.
export const type = {
  hero: { fontSize: 76, fontWeight: "800" },
  display: { fontSize: 40, fontWeight: "800" },
  title: { fontSize: 32, fontWeight: "800" },
  heading: { fontSize: 20, fontWeight: "600" },
  body: { fontSize: 15, fontWeight: "400" },
  label: { fontSize: 13, fontWeight: "600" },
  meta: { fontSize: 12, fontWeight: "400" },
} as const satisfies Record<string, TextStyle>;

export const radius = {
  // 버튼, 입력 상자
  control: 14,
  // 탭바, 시트
  sheet: 24,
  // 배지, 알약 막대
  pill: 999,
} as const;

export const space = {
  s4: 4,
  s8: 8,
  s12: 12,
  s16: 16,
  s20: 20,
  s24: 24,
  s32: 32,
  s40: 40,
} as const;

// 자주 반복하는 동작(세트 완료, 값 조절)은 base(200ms)를 넘기지 않는다.
export const motion = {
  fast: 120,
  base: 200,
  slow: 320,
  easing: Easing.out(Easing.cubic),
} as const;

export const theme = { colors, type, radius, space, motion } as const;
