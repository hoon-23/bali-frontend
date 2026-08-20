import axios from "axios";
import { useAuthStore } from "../../store/authStore";
import { getRefreshToken, setRefreshToken } from "../auth/tokenStorage";

export const API_BASE_URL = "http://localhost:8080";

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
