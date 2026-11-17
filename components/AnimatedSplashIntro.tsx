import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Dimensions, Easing, Image, StyleSheet, View } from "react-native";

import layout from "../assets/splash-layout.json";
import { LOGO_BOX_W, LOGO_PARTS, LOGO_TILT_DEG, LOGO_UNIT_H, LOGO_UNIT_W } from "./LogoMark";

// 네이티브 런치스크린과 같은 풀블리드 이미지를 그대로 재사용한다 — hideAsync() 전환 순간 두 레이어의
// 로고 위치/크기가 어긋나 겹쳐 보이던 현상을 없애기 위함. resizeMode="cover" + absoluteFillObject가 flex 해석에
// 기대는 대신 화면 실측 크기를 직접 넘겨 위치가 어긋나지 않게 한다(실기기에서 cover 크롭 기준점이 달라져
// 로고가 아래로 밀려 보이던 문제).
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// 이미지는 "빈 덤벨"(흐린 판)과 흐린 글자가 박혀 있고, 이 컴포넌트가 같은 자리에서 판을 차례로 채운다.
// 이미지 좌표(assets/splash-layout.json, scripts/make-logo-assets.py가 만든다)를 화면 좌표로 옮기는 비율.
// 이미지는 cover로 그려지므로 큰 쪽 비율을 쓰고, 넘치는 부분은 양쪽에서 똑같이 잘린다.
const SCALE = Math.max(SCREEN_WIDTH / layout.imageWidth, SCREEN_HEIGHT / layout.imageHeight);
const OFFSET_X = (SCREEN_WIDTH - layout.imageWidth * SCALE) / 2;
const OFFSET_Y = (SCREEN_HEIGHT - layout.imageHeight * SCALE) / 2;

// 연출 타이밍(밀리초). 판 하나가 채워지는 시간, 판 사이 간격, 시작 지연, 글자가 채워지는 시점.
const FILL_MS = 420;
const FILL_STEP_MS = 200;
const FILL_START_MS = 250;
const WORD_DELAY_MS = FILL_START_MS + LOGO_PARTS.length * FILL_STEP_MS + 100;
const WORD_MS = 550;
const PULSE_DELAY_MS = WORD_DELAY_MS + WORD_MS + 100;
const PULSE_MS = 750;
const PULSE_SCALE = 1.14;

const FILL_COLOR: Record<(typeof LOGO_PARTS)[number]["state"], string> = {
  done: "#FFFFFF",
  current: "#2DD4BF",
  remaining: "rgba(255, 255, 255, 0.35)",
};

type AnimatedSplashIntroProps = {
  // 이 컴포넌트의 배경 이미지가 실제로 디코딩되어 화면에 그려질 준비가 된 시점을 알려준다 —
  // 네이티브 스플래시는 이 콜백이 오기 전까지 계속 떠 있어야 두 레이어 사이에 로고 없는
  // 빈 화면 프레임(깜빡임)이 끼지 않는다.
  onImageReady?: () => void;
};

export function AnimatedSplashIntro({ onImageReady }: AnimatedSplashIntroProps) {
  const [imageReady, setImageReady] = useState(false);
  const fills = useRef(LOGO_PARTS.map(() => new Animated.Value(0))).current;
  const word = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  // 배경 이미지가 그려진 뒤에만 채우기 시작한다(이미지 없이 판만 먼저 보이지 않게).
  useEffect(() => {
    if (!imageReady) return;
    let cancelled = false;
    let loop: Animated.CompositeAnimation | null = null;

    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          // "동작 줄이기": 움직임 없이 완성된 모양을 바로 보여준다.
          fills.forEach((v) => v.setValue(1));
          word.setValue(1);
          return;
        }
        Animated.parallel([
          ...fills.map((v, i) =>
            Animated.timing(v, {
              toValue: 1,
              duration: FILL_MS,
              delay: FILL_START_MS + i * FILL_STEP_MS,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            })
          ),
          Animated.timing(word, {
            toValue: 1,
            duration: WORD_MS,
            delay: WORD_DELAY_MS,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
        // 로딩이 이어지는 동안 민트 판(지금 세트)만 은은하게 맥박처럼 뛴다. 이 컴포넌트가 사라지면 같이 멈춘다.
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: PULSE_SCALE, duration: PULSE_MS, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 1, duration: PULSE_MS, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ])
        );
        setTimeout(() => {
          if (!cancelled) loop?.start();
        }, PULSE_DELAY_MS);
      });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [imageReady, fills, word, pulse]);

  // 마크의 화면상 크기와 위치(이미지 좌표 → 화면 좌표).
  const markW = layout.mark.w * SCALE;
  const markH = layout.mark.h * SCALE;
  const u = markW / LOGO_BOX_W; // 단위당 px
  const parts = useMemo(
    () =>
      LOGO_PARTS.map((part) => ({
        left: part.x * u,
        top: part.y * u,
        width: part.w * u,
        height: part.h * u,
        radius: (Math.min(part.w, part.h) * u) / 2,
        isBar: part.state === "done" && part.h < part.w, // 가운데 막대는 가로로 채운다
        state: part.state,
      })),
    [u]
  );

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/splash-background.png")}
        style={{ position: "absolute", top: 0, left: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
        resizeMode="cover"
        onLoadEnd={() => {
          setImageReady(true);
          onImageReady?.();
        }}
      />
      {imageReady && (
        <>
          {/* 흐린 판 위에서 판 안쪽만 채운다 — 판 바탕은 투명이라 이미지에 박힌 흐린 판이 그대로 보인다. */}
          <View
            style={{
              position: "absolute",
              left: OFFSET_X + layout.mark.x * SCALE,
              top: OFFSET_Y + layout.mark.y * SCALE,
              width: markW,
              height: markH,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: LOGO_UNIT_W * u,
                height: LOGO_UNIT_H * u,
                transform: [{ rotate: `${LOGO_TILT_DEG}deg` }],
              }}
            >
              {parts.map((part, index) => {
                const isCurrent = part.state === "current";
                return (
                  <Animated.View
                    key={index}
                    style={{
                      position: "absolute",
                      left: part.left,
                      top: part.top,
                      width: part.width,
                      height: part.height,
                      borderRadius: part.radius,
                      overflow: "hidden",
                      transform: isCurrent ? [{ scale: pulse }] : undefined,
                    }}
                  >
                    <Animated.View
                      style={{
                        ...StyleSheet.absoluteFillObject,
                        backgroundColor: FILL_COLOR[part.state],
                        // 판은 아래에서 위로, 막대는 왼쪽에서 오른쪽으로 채운다.
                        transformOrigin: part.isBar ? "0% 50%" : "50% 100%",
                        transform: [part.isBar ? { scaleX: fills[index] } : { scaleY: fills[index] }],
                      }}
                    />
                  </Animated.View>
                );
              })}
            </View>
          </View>
          {/* 글자: 흐린 글자 위에 같은 모양의 흰 글자를 겹쳐 서서히 채운다. */}
          <Animated.Image
            source={require("../assets/images/logo/swayt-wordmark-white.png")}
            style={{
              position: "absolute",
              left: OFFSET_X + layout.word.x * SCALE,
              top: OFFSET_Y + layout.word.y * SCALE,
              width: layout.word.w * SCALE,
              height: layout.word.h * SCALE,
              opacity: word,
            }}
            resizeMode="contain"
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
});
