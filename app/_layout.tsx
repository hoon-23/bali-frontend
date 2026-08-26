import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import NaverLogin from "@react-native-seoul/naver-login";
import { useAuthStore } from "../store/authStore";
import { getRefreshToken } from "../lib/auth/tokenStorage";
import { refreshAccessToken } from "../lib/api/client";
import { AppAlertModal } from "../components/AppAlertModal";
import { AnimatedSplashIntro } from "../components/AnimatedSplashIntro";

// JS 번들이 로드되기 전(네이티브 부팅 구간)만 네이티브 스플래시로 가리고,
// RootLayout이 mount되는 즉시 JS가 그리는 AnimatedSplashIntro로 바통을 넘긴다.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 401) return false;
        return failureCount < 3;
      },
    },
  },
});

GoogleSignin.configure({ iosClientId: "803810989144-q9q2upa4sjjeda3biu455gi3jl99a5pn.apps.googleusercontent.com" });
NaverLogin.initialize({
  appName: "Swayt",
  consumerKey: "yTFErRaCn2FXtqC_mrRE",
  consumerSecret: "lwFm23x2Iz",
  serviceUrlSchemeIOS: "com.younghoon.swayt",
});

// 네이티브 스플래시를 hide()(fade:false)로 즉시 걷어도, iOS가 풀블리드 런치 이미지를
// 내부적으로 걷어내는 전환 자체에 옵션과 무관하게 2~3초짜리 크로스페이드 잔상이 남는다
// (enableFullScreenImage_legacy 경로의 알려지지 않은 제약으로 보임, 실기기/시뮬레이터
// 반복 검증으로 확인). 이 잔상이 홈 화면 위에 겹쳐 보이지 않도록, AnimatedSplashIntro가
// 이 시간 동안은 계속 화면을 덮고 있게 최소 노출 시간을 둔다 — 두 레이어가 동일한
// splash-background.png를 쓰므로 그 사이엔 전환이 아예 안 보인다.
const MIN_SPLASH_DURATION_MS = 3000;

export default function RootLayout() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [minDurationElapsed, setMinDurationElapsed] = useState(false);
  // 부트스트랩 + 리다이렉트가 완전히 끝나서 AnimatedSplashIntro 오버레이를 걷어도 되는 시점.
  const [redirectCommitted, setRedirectCommitted] = useState(false);
  const revealed = redirectCommitted && minDurationElapsed;
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();

  // AnimatedSplashIntro의 배경 이미지가 실제로 디코딩 완료된 뒤에만 네이티브 스플래시를
  // 내린다 — 순서를 안 지키면 "네이티브 이미지 사라짐 → JS 이미지 아직 안 그려진 빈 배경 →
  // JS 이미지 등장" 사이에 한 프레임짜리 깜빡임이 생긴다. onLoadEnd가 안 오는 경우를 대비해
  // 안전장치로 최대 2초까지만 기다린다.
  const [introImageReady, setIntroImageReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIntroImageReady(true), 2000);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!introImageReady) return;
    SplashScreen.setOptions({ fade: false, duration: 0 });
    SplashScreen.hide();
    const timer = setTimeout(() => setMinDurationElapsed(true), MIN_SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [introImageReady]);

  useEffect(() => {
    (async () => {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        try {
          await refreshAccessToken();
        } catch {
          // refresh 실패 시 로그인 화면에 그대로 머무름 (accessToken null 유지)
        }
      }
      setBootstrapped(true);
    })();
  }, [setAccessToken]);

  // 콜드 스타트 부트스트랩이 끝나면(성공/실패 무관) 인증 상태에 맞는 화면으로 보낸다.
  // apiClient의 401 인터셉터가 refresh까지 실패해 authStore.logout()을 호출하는 경우에도
  // isAuthenticated가 false로 바뀌며 이 effect가 다시 실행되어 로그인 화면으로 되돌린다.
  useEffect(() => {
    if (!bootstrapped) return;
    router.replace(isAuthenticated ? "/home" : "/");
    // replace() 호출 직후 1프레임만으론 새 라우트 커밋이 끝나지 않는다 —
    // 커밋 후 한 프레임을 더 넘겨서 목적지 화면이 완전히 반영된 뒤에 오버레이를 걷는다.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setRedirectCommitted(true);
      });
    });
  }, [bootstrapped, isAuthenticated, router]);

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0B0B0F" } }}>
          {/* 로그인↔탭 전환은 부트스트랩이 트리거하는 리다이렉트라 사용자 액션이 아님 —
              기본 슬라이드 애니메이션을 끄면 방금 막 mount된 로그인 화면이 밀려나가며
              가장자리에 잔상으로 남는 현상이 사라진다 */}
          <Stack.Screen name="index" options={{ animation: "none" }} />
          <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
          <Stack.Screen name="workout/[sessionId]" options={{ presentation: "modal" }} />
          <Stack.Screen name="workout/summary" options={{ presentation: "modal" }} />
          <Stack.Screen name="legal/privacy-policy" options={{ presentation: "modal" }} />
          <Stack.Screen name="routines/new" options={{ presentation: "modal" }} />
          <Stack.Screen name="routines/exercise-picker" options={{ presentation: "modal" }} />
          <Stack.Screen name="routines/schedule" options={{ presentation: "modal" }} />
        </Stack>
        <AppAlertModal />
        {/* Stack은 항상 mount돼 있어야 router.replace()가 동작하므로, 로그인/홈 화면이
            실제로 노출되지 않게 이 오버레이로 그 위를 완전히 가린다 — revealed 전까지 유지 */}
        {!revealed && (
          <View style={StyleSheet.absoluteFill}>
            <AnimatedSplashIntro onImageReady={() => setIntroImageReady(true)} />
          </View>
        )}
      </QueryClientProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
});
