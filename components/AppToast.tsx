import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "./AppText";

export type AppToastData = {
  // 토스트가 바뀔 때마다 달라지는 값 — 같은 문구여도 타이머/애니메이션을 다시 시작한다.
  id: number;
  message: string;
  actionLabel: string;
  onAction: () => void;
};

type AppToastProps = {
  toast: AppToastData | null;
  onDismiss: () => void;
  // 부모(SafeAreaView) 하단 기준 위치 — 하단 버튼 바로 위에 오도록 호출 쪽에서 정한다.
  bottom: number;
};

const VISIBLE_MS = 6000;
const FADE_MS = 180;

// 하단 오버레이 토스트. absolute로 띄워 레이아웃을 밀지 않고, 토스트 영역만 터치를 받는다.
// 약 6초 뒤 자동으로 사라지며(터치 중엔 타이머 정지), 새 토스트가 오면 이전 것을 교체한다.
export function AppToast({ toast, onDismiss, bottom }: AppToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // 자동 사라짐 타이머 시작 — 호출할 때마다 처음부터 다시 센다.
  const startTimer = () => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) onDismissRef.current();
        }
      );
    }, VISIBLE_MS);
  };

  useEffect(() => {
    if (!toast) return;
    opacity.setValue(0);
    translateY.setValue(8);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
    ]).start();
    startTimer();
    // 언마운트/교체 시 타이머와 진행 중인 애니메이션을 정리한다.
    return () => {
      clearTimer();
      opacity.stopAnimation();
      translateY.stopAnimation();
    };
  }, [toast?.id]);

  if (!toast) return null;

  return (
    // 바깥 래퍼는 터치를 통과시키고(box-none), 카드 영역만 터치를 받는다.
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <Animated.View
        style={[styles.card, { opacity, transform: [{ translateY }] }]}
        // 자식(액션 버튼) 터치도 여기로 버블링되므로, 손가락이 닿아 있는 동안 타이머를 멈추고 뗄 때 다시 6초를 센다.
        onTouchStart={clearTimer}
        onTouchEnd={startTimer}
        onTouchCancel={startTimer}
      >
        <AppText style={styles.message} numberOfLines={2} accessibilityLiveRegion="polite">
          {toast.message}
        </AppText>
        <Pressable
          onPress={toast.onAction}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={toast.actionLabel}
        >
          <AppText style={styles.action}>{toast.actionLabel}</AppText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 24,
    right: 24,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1C1C25",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  message: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
  },
  action: {
    color: "#2DD4BF",
    fontSize: 14,
    fontWeight: "700",
  },
});
