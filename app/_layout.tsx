import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useAuthStore } from "../store/authStore";
import { getRefreshToken } from "../lib/auth/tokenStorage";
import { refreshAccessToken } from "../lib/api/client";

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

export default function RootLayout() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();

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
  }, [bootstrapped, isAuthenticated, router]);

  if (!bootstrapped) {
    return null; // 짧은 순간이라 별도 스플래시 UI 없이 빈 화면
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="workout/[sessionId]" options={{ presentation: "modal" }} />
          <Stack.Screen name="workout/summary" options={{ presentation: "modal" }} />
          <Stack.Screen name="set-entry" options={{ presentation: "modal" }} />
          <Stack.Screen name="legal/privacy-policy" options={{ presentation: "modal" }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
