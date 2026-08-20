import { create } from "zustand";
import { clearRefreshToken } from "../lib/auth/tokenStorage";

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
    set({ accessToken: null, isAuthenticated: false });
  },
}));
