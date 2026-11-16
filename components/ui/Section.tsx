import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, type } from "../../constants/theme";
import { AppText } from "../AppText";

type SectionProps = {
  label?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// 상자와 그림자가 없는 구역. 작은 라벨과 내용의 글자 크기 차이로 구분한다 —
// 모든 것을 같은 카드에 담으면 중요한 것과 덜 중요한 것이 똑같이 보이기 때문이다.
export function Section({ label, children, style }: SectionProps) {
  return (
    <View style={style}>
      {label ? <AppText style={styles.label}>{label}</AppText> : null}
      {children}
    </View>
  );
}

// 구역 사이를 나누는 얇은 선.
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  label: {
    ...type.meta,
    color: colors.text3,
    marginBottom: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
});
