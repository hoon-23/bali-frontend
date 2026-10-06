import { type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useContext, useEffect, useRef, useState } from "react";
import { NavigationContext } from "@react-navigation/native";

// 모든 차트/바 애니메이션의 지속시간·이징은 여기서만 관리한다.
const FILL_DURATION_MS = 700;
const FILL_EASING = Easing.out(Easing.cubic);
const CELL_FADE_DURATION_MS = 250;

// 화면이 포커스를 얻을 때마다 콜백을 부른다(최초 마운트 때는 부르지 않는다).
// 탭 화면은 마운트된 채 유지되므로 재진입 시 애니메이션을 다시 재생하는 데 쓴다.
// 탭/스택 밖(내비게이션 컨텍스트 없음)에서는 아무 일도 하지 않아 에러가 나지 않는다.
function useOnFocus(callback: () => void) {
  const navigation = useContext(NavigationContext);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!navigation) return;
    return navigation.addListener("focus", () => callbackRef.current());
  }, [navigation]);
}

type AnimatedBarProps = {
  // 0~1 사이 채움 비율. 범위를 벗어나면 잘라낸다.
  progress: number;
  // horizontal: 부모 너비 기준 width %, vertical: 부모 높이 기준 height %
  // (vertical은 부모 트랙에 고정 height가 있어야 한다)
  direction?: "horizontal" | "vertical";
  // 채움 영역의 모양(색, 둥근 모서리, 두께 등). 트랙은 호출하는 쪽에서 그린다.
  style?: StyleProp<ViewStyle>;
  // 마운트 시 시작 지연(ms). 막대마다 시차를 줄 때 사용한다.
  delay?: number;
};

// 트랙 안쪽 채움만 0에서 목표값까지 차오르는 막대. 값이 바뀌면 부드럽게 따라간다.
export function AnimatedBar({ progress, direction = "horizontal", style, delay = 0 }: AnimatedBarProps) {
  const fill = useSharedValue(0);

  const target = Math.min(1, Math.max(0, progress));

  const animateToTarget = (value: number) => {
    // 시스템의 동작 줄이기 설정이 켜져 있으면 애니메이션 없이 바로 최종값으로 간다.
    fill.value = withDelay(
      delay,
      withTiming(value, { duration: FILL_DURATION_MS, easing: FILL_EASING, reduceMotion: ReduceMotion.System }),
      ReduceMotion.System,
    );
  };

  useEffect(() => {
    animateToTarget(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, delay, fill]);

  // 탭 재진입 시: 같은 JS 틱 안에서 0으로 리셋한 뒤 곧바로 다시 채운다.
  // 두 대입이 UI 스레드에서 순서대로 처리되어 최종 모양이 한 프레임도 다시 보이지 않는다.
  useOnFocus(() => {
    fill.value = 0;
    animateToTarget(target);
  });

  const animatedStyle = useAnimatedStyle(() =>
    direction === "vertical" ? { height: `${fill.value * 100}%` } : { width: `${fill.value * 100}%` },
  );

  return <Animated.View style={[style, animatedStyle]} />;
}

type AnimatedCellProps = {
  // 칸 순서. 순서에 비례해 페이드인이 늦게 시작한다.
  index: number;
  // 칸 사이 시차(ms)
  stagger?: number;
  style?: StyleProp<ViewStyle>;
};

// 히트맵 칸용 페이드인. 칸마다 훅을 쓰지 않고 진입(entering) 애니메이션만 사용해 가볍게 처리한다.
// 포커스 시마다 key를 바꿔 재마운트하면 진입 애니메이션이 다시 재생된다.
export function AnimatedCell({ index, stagger = 15, style }: AnimatedCellProps) {
  const [replayKey, setReplayKey] = useState(0);
  useOnFocus(() => setReplayKey((k) => k + 1));

  return (
    <Animated.View
      key={replayKey}
      entering={FadeIn.delay(index * stagger)
        .duration(CELL_FADE_DURATION_MS)
        .reduceMotion(ReduceMotion.System)}
      style={style}
    />
  );
}
