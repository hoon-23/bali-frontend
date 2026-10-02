import { create } from "zustand";
import { clearRefreshToken } from "../lib/auth/tokenStorage";
import { setAppIconBadgeCount } from "../lib/notifications";

type AuthState = {
  accessToken: string | null;
  isAuthenticated: boolean;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  isAuthenticated: false,
  setAccessToken: (token) => set({ accessToken: token, isAuthenticated: token !== null }),
  logout: () => {
    clearRefreshToken();
    // 로그아웃한 계정의 안 읽은 알림 수가 아이콘에 남지 않게 지운다.
    setAppIconBadgeCount(0);
    set({ accessToken: null, isAuthenticated: false });
  },
}));
