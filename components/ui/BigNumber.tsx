import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, type } from "../../constants/theme";
import { AppText } from "../AppText";

type BigNumberProps = {
  value: string | number;
  // 숫자 뒤에 붙는 작은 회색 글자("/ 4 세트", "일 운동").
  unit?: string;
  size: "hero" | "display";
  style?: StyleProp<ViewStyle>;
};

// 화면에서 가장 먼저 읽혀야 하는 숫자 하나. 흘끗 봐도 읽히도록 크게, 단위는 작고 흐리게 둔다.
export function BigNumber({ value, unit, size, style }: BigNumberProps) {
  const isHero = size === "hero";
  return (
    <View style={[styles.row, style]}>
      <AppText
        style={[styles.value, isHero ? styles.hero : styles.display]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
        {value}
      </AppText>
      {unit ? (
        <AppText style={[styles.unit, isHero ? styles.unitHero : styles.unitDisplay]} numberOfLines={1}>
          {unit}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    flexShrink: 1,
  },
  value: {
    color: colors.text,
    flexShrink: 1,
    fontVariant: ["tabular-nums"],
  },
  hero: {
    ...type.hero,
    letterSpacing: -3,
    lineHeight: 80,
  },
  display: {
    ...type.display,
    letterSpacing: -1,
    lineHeight: 44,
  },
  unit: {
    fontWeight: "600",
  },
  unitHero: {
    fontSize: 22,
    color: colors.text3,
    marginLeft: 8,
  },
  unitDisplay: {
    fontSize: 16,
    color: colors.text2,
    marginLeft: 6,
  },
});
