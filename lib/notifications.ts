import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { DevicePlatform } from "../hooks/api/useNotifications";

const PUSH_TOKEN_CACHE_KEY = "swayt-expo-push-token";

export const devicePlatform: DevicePlatform = Platform.OS === "ios" ? "IOS" : "ANDROID";

// 마지막으로 서버에 등록한 토큰 — 로그아웃/탈퇴 시 DELETE 요청에 재사용한다.
export async function getCachedPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_CACHE_KEY);
}

async function cachePushToken(token: string): Promise<void> {
  await AsyncStorage.setItem(PUSH_TOKEN_CACHE_KEY, token);
}

export async function clearCachedPushToken(): Promise<void> {
  await AsyncStorage.removeItem(PUSH_TOKEN_CACHE_KEY);
}

// 권한을 요청하고 Expo push token을 발급받는다. 시뮬레이터/에뮬레이터에서는
// 원격 푸시 토큰 발급이 불가능하므로 null을 반환한다.
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await cachePushToken(token);
  return token;
}
