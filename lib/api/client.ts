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

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 || originalRequest._retry) {
      throw error;
    }
    originalRequest._retry = true;

    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      useAuthStore.getState().logout();
      throw error;
    }

    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, { refreshToken });
      useAuthStore.getState().setAccessToken(data.accessToken);
      await setRefreshToken(data.refreshToken); // 구 refresh token은 폐기되므로 반드시 교체
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().logout();
      throw refreshError;
    }
  }
);
