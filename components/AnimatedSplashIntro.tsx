import { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, Image, StyleSheet, View } from "react-native";

// resizeMode="cover" + absoluteFillObject가 flex 레이아웃 해석에 기대는 대신,
// 네이티브 storyboard와 동일하게 화면 실측 크기를 직접 넘겨 로고/그라데이션 위치가
// 어긋나지 않게 한다(실기기에서 cover 크롭 기준점이 달라져 로고가 아래로
// 밀려 보이던 문제).
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Claude Design 목업(Swayt Splash.dc.html)의 swayt-slide 키프레임을 그대로 이식:
// 1.4s ease-in-out으로 무한 반복, 트랙 왼쪽 바깥에서 오른쪽 바깥까지 쓸고 지나간다.
const TRACK_WIDTH = 180;
const TRACK_HEIGHT = 4;
const BAR_WIDTH = TRACK_WIDTH / 3;
const SLIDE_DURATION_MS = 1400;

type AnimatedSplashIntroProps = {
  // 이 컴포넌트의 배경 이미지가 실제로 디코딩되어 화면에 그려질 준비가 된 시점을 알려준다 —
  // 네이티브 스플래시는 이 콜백이 오기 전까지 계속 떠 있어야 두 레이어 사이에 로고 없는
  // 빈 화면 프레임(깜빡임)이 끼지 않는다.
  onImageReady?: () => void;
};

export function AnimatedSplashIntro({ onImageReady }: AnimatedSplashIntroProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: SLIDE_DURATION_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-BAR_WIDTH, TRACK_WIDTH],
  });

  return (
    <View style={styles.container}>
      {/* 네이티브 런치스크린과 동일한 풀블리드 이미지를 그대로 재사용 —
          hideAsync() 전환 순간 두 레이어의 로고 위치/크기가 어긋나 겹쳐 보이던
          현상(네이티브 정적 이미지 ↔ 이 컴포넌트의 중앙 로고)을 없애기 위함 */}
      <Image
        source={require("../assets/splash-background.png")}
        style={{ position: "absolute", top: 0, left: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
        resizeMode="cover"
        onLoadEnd={onImageReady}
      />
      <View style={styles.track}>
        <Animated.View style={[styles.bar, { transform: [{ translateX }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
  track: {
    position: "absolute",
    bottom: 96,
    alignSelf: "center",
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: "rgba(47, 227, 172, 0.15)",
    overflow: "hidden",
  },
  bar: {
    width: BAR_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: "#2FE3AC",
  },
});
