import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

type ScreenBackgroundProps = {
  children: ReactNode;
};

// 중앙만 틸 색상이 은은하게 퍼지고 네 모서리는 항상 기본 배경색(#0B0B0F)으로
// 수렴하는 방사형 그라데이션. 화면 전환 애니메이션 중 모서리에 노출되는
// 네비게이션 컨트롤러의 무색 배경(react-native-screens 이슈)이 눈에 띄지 않도록
// 모서리 색을 미리 배경색과 맞춰두는 용도.
export function ScreenBackground({ children }: ScreenBackgroundProps) {
  return (
    <View style={styles.container}>
      <Svg style={styles.glow} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="glow" cx="50" cy="40" r="55" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#1F5F5B" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#1F5F5B" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#glow)" />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
  },
});
