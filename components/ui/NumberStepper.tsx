import { Minus, Plus } from "lucide-react-native";
import { StyleSheet, View, type KeyboardTypeOptions } from "react-native";

import { colors, radius, type } from "../../constants/theme";
import { AppText } from "../AppText";
import { AppTextInput } from "../AppTextInput";
import { PressableScale } from "./PressableScale";

type NumberStepperProps = {
  label: string;
  value: string;
  unit: string;
  // − 는 -1, + 는 1. 실제 증감 폭과 한도는 호출하는 쪽이 정한다(lib/format/stepper).
  onStep: (direction: 1 | -1) => void;
  // 가운데 숫자를 눌러 키패드로 직접 입력할 때.
  onChangeText: (value: string) => void;
  keyboardType?: KeyboardTypeOptions;
};

// − 값 + 상자. 한 번 탭으로 조절하고, 크게 바꿀 때만 숫자를 눌러 직접 입력한다 —
// 운동 중에는 키패드를 열고 지우고 다시 치는 일이 번거롭기 때문이다.
export function NumberStepper({ label, value, unit, onStep, onChangeText, keyboardType = "numeric" }: NumberStepperProps) {
  return (
    <View style={styles.box}>
      <AppText style={styles.label}>{label}</AppText>
      <View style={styles.row}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`${label} 줄이기`}
          onPress={() => onStep(-1)}
          style={styles.stepButton}
        >
          <Minus size={20} color={colors.text2} />
        </PressableScale>
        <View style={styles.valueWrap}>
          <AppTextInput
            style={styles.value}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            placeholder="0"
            placeholderTextColor={colors.text3}
            selectTextOnFocus
            accessibilityLabel={label}
          />
          <AppText style={styles.unit}>{unit}</AppText>
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`${label} 늘리기`}
          onPress={() => onStep(1)}
          style={styles.stepButton}
        >
          <Plus size={20} color={colors.text} />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    paddingTop: 10,
    paddingBottom: 4,
  },
  label: {
    ...type.meta,
    color: colors.text3,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  // 손가락으로 누르기 충분한 44×44.
  stepButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  valueWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 3,
  },
  value: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    minWidth: 28,
    flexShrink: 1,
    padding: 0,
    fontVariant: ["tabular-nums"],
  },
  unit: {
    ...type.label,
    color: colors.text3,
  },
});
