import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius } from "../../constants/theme";
import { AppText } from "../AppText";
import { PressableScale } from "./PressableScale";

export type ButtonSize = "md" | "lg";
// sm: 글자 13의 작은 민트 버튼 — 화면의 주 동작이 보조 영역에 있을 때 쓴다.
type PrimaryButtonSize = ButtonSize | "sm";

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  // lg는 운동 중 화면처럼 화면을 안 보고 누르는 자리에 쓴다.
  size?: PrimaryButtonSize;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

// 민트 주 버튼. 한 화면에 하나만 둔다 — 지금 눌러야 할 단 하나의 동작에만 쓴다.
export function PrimaryButton({ title, onPress, size = "md", disabled, style }: PrimaryButtonProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, size === "lg" && styles.large, size === "sm" && styles.small, disabled && styles.disabled, style]}
    >
      <AppText style={[styles.text, size === "lg" && styles.textLarge, size === "sm" && styles.textSmall]} numberOfLines={1}>
        {title}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.control,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  large: {
    height: 58,
  },
  small: {
    height: 36,
    paddingHorizontal: 14,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: "800",
  },
  textSmall: {
    fontSize: 13,
  },
  textLarge: {
    fontSize: 17,
  },
});
