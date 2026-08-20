import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useAuthStore } from "../store/authStore";
import { getRefreshToken, setRefreshToken } from "../lib/auth/tokenStorage";
import { API_BASE_URL } from "../lib/api/client";
import axios from "axios";

const queryClient = new QueryClient();

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
          const { data } = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, { refreshToken });
          setAccessToken(data.accessToken);
          await setRefreshToken(data.refreshToken);
        } catch {
          // refresh 실패 시 로그인 화면에 그대로 머무름 (accessToken null 유지)
        }
      }
      setBootstrapped(true);
    })();
  }, [setAccessToken]);

  // apiClient의 401 인터셉터가 refresh까지 실패해 authStore.logout()을 호출하면
  // isAuthenticated가 false로 바뀌고, 여기서 감지해 로그인 화면으로 되돌린다.
  useEffect(() => {
    if (bootstrapped && !isAuthenticated) {
      router.replace("/");
    }
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
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
