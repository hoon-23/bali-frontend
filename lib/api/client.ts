import axios from "axios";
import { NativeModules } from "react-native";
import { useAuthStore } from "../../store/authStore";
import { getRefreshToken, setRefreshToken } from "../auth/tokenStorage";

// 실물 기기에서는 "localhost"가 기기 자신을 가리켜서 개발 머신의 백엔드에 닿지 않는다.
// Metro를 쓰는 dev client는 JS 번들을 내려받은 호스트(scriptURL, 개발 머신의 LAN IP)를
// 재사용해서 알아낼 수 있지만, Metro 없이 JS가 바이너리에 번들되는 Release/standalone
// 빌드는 scriptURL이 file:// 경로라 이 방법이 안 통한다 — 그럴 땐 EXPO_PUBLIC_API_BASE_URL로
// 명시한 주소를 우선 사용한다(.env.example 참고). Bridgeless/New Architecture에서는
// NativeModules.SourceCode.scriptURL을 프로퍼티로 바로 읽으면 undefined라 getConstants()로 접근한다.
function resolveApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  const scriptURL: string | undefined = NativeModules.SourceCode?.getConstants?.()?.scriptURL;
  const host = scriptURL?.match(/^https?:\/\/([^:/]+)/)?.[1];
  return host ? `http://${host}:8080` : "http://localhost:8080";
}

export const API_BASE_URL = resolveApiBaseUrl();

export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    useAuthStore.getState().logout();
    throw new Error("No refresh token available");
  }
  const { data } = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, { refreshToken });
  useAuthStore.getState().setAccessToken(data.accessToken);
  await setRefreshToken(data.refreshToken);
  return data.accessToken;
}

let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error(
      `[API] ${error.config?.method?.toUpperCase()} ${error.config?.url} ->`,
      error.response?.status,
      error.response?.data ?? error.message
    );
    const originalRequest = error.config;
    const isAuthEndpoint = typeof originalRequest?.url === "string" && originalRequest.url.startsWith("/api/v1/auth/");
    if (isAuthEndpoint || error.response?.status !== 401 || originalRequest._retry) {
      throw error;
    }
    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError: any) {
      const status = refreshError?.response?.status;
      if (status && status >= 400 && status < 500) {
        useAuthStore.getState().logout();
      }
      // network errors and 5xx: leave the stored refresh token intact so the
      // user can retry later instead of being forced to log in again
      throw refreshError;
    }
  }
);
