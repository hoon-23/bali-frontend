import { create } from "zustand";

export type AppAlertButton = {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

type AppAlertConfig = {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
};

type AlertState = {
  current: AppAlertConfig | null;
  show: (config: AppAlertConfig) => void;
  hide: () => void;
};

export const useAlertStore = create<AlertState>((set) => ({
  current: null,
  show: (config) => set({ current: config }),
  hide: () => set({ current: null }),
}));
