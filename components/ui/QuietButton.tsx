import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius } from "../../constants/theme";
import { AppText } from "../AppText";
import { PressableScale } from "./PressableScale";
import type { ButtonSize } from "./PrimaryButton";

type QuietButtonProps = {
  title: string;
  onPress: () => void;
  // filled: 어두운 배경의 보조 버튼. outline: 민트 테두리 — "곧 시작할 수 있는" 대기 상태의 주 동작.
  // text: 배경 없는 글자 버튼 — 자주 쓰지 않는 보조 동작.
  variant?: "filled" | "outline" | "text";
  // sm: 글자 크기(13)에 맞춘 작은 버튼 — 화면의 보조 동작을 눈에 띄게 하되 크게 키우지 않을 때 쓴다.
  size?: ButtonSize | "sm";
  tone?: "default" | "danger";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

// 민트로 채우지 않는 버튼. 주 버튼(PrimaryButton)이 아닌 모든 버튼은 이것을 쓴다.
export function QuietButton({
  title,
  onPress,
  variant = "filled",
  size = "md",
  tone = "default",
  disabled,
  style,
}: QuietButtonProps) {
  const isText = variant === "text";
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      hitSlop={isText ? 10 : size === "sm" ? 4 : undefined}
      style={[
        isText ? styles.textBase : styles.base,
        !isText && size === "lg" && styles.large,
        !isText && size === "sm" && styles.small,
        variant === "filled" && styles.filled,
        variant === "outline" && styles.outline,
        disabled && styles.disabled,
        style,
      ]}
    >
      <AppText
        style={[
          isText ? styles.textLabel : styles.label,
          !isText && size === "lg" && styles.labelLarge,
          !isText && size === "sm" && styles.labelSmall,
          tone === "danger" && styles.danger,
        ]}
        numberOfLines={1}
      >
        {title}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.control,
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
  filled: {
    backgroundColor: colors.surface,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  textBase: {
    // 글자만 보이지만 손가락으로 누를 수 있게 최소 높이를 잡는다(hitSlop과 합쳐 44pt 이상).
    minHeight: 28,
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  labelSmall: {
    fontSize: 13,
  },
  labelLarge: {
    fontSize: 17,
  },
  textLabel: {
    color: colors.text2,
    fontSize: 13,
    fontWeight: "600",
  },
  danger: {
    color: colors.danger,
  },
});
