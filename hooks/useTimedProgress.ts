import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";

type Options = {
  // 재생 시간(ms)
  duration: number;
  // 화면 전환이 끝난 뒤 보이도록 재생을 늦추는 시간(ms)
  delay?: number;
  // false면 t=0을 유지하고, true가 되는 순간 한 번만 재생한다(기본 true: 마운트 즉시 재생).
  enabled?: boolean;
};

// 마운트 시 한 번 0 → 1로 진행되는 이징 값을 돌려주는 공용 훅.
// 호출한 쪽은 이 값(t)으로 바 너비·카운팅 숫자를 직접 계산하면 바와 숫자가 항상 같은 시계로 움직인다.
// 값을 React state로 내보내므로(JS 구동) width/텍스트처럼 네이티브 드라이버가 안 되는 속성에도 쓸 수 있다.
export function useTimedProgress({ duration, delay = 0, enabled = true }: Options): number {
  const [t, setT] = useState(0);
  // 한 번 재생을 시작했으면 enabled가 다시 바뀌어도 재생하지 않는다.
  const playedRef = useRef(false);

  useEffect(() => {
    if (!enabled || playedRef.current) return;
    playedRef.current = true;
    const value = new Animated.Value(0);
    const id = value.addListener(({ value: v }) => setT(v));
    const animation = Animated.timing(value, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => {
      animation.stop();
      value.removeListener(id);
    };
    // enabled가 처음 true가 될 때 한 번만 재생한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return t;
}
