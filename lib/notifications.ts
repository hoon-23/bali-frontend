import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import type { DevicePlatform } from "../hooks/api/useNotifications";

// expo-notifications는 최상단에서 import하면 네이티브 모듈을 즉시 바인딩하려 시도한다.
// 2026-09-10 유료 Apple Developer 전환 후 Push capability는 정식으로 활성화됐지만,
// capability가 없는 서명(예: 다시 무료 Personal Team으로 돌아가는 경우)에서는 이 즉시
// 바인딩이 앱 시작과 동시에 전역 크래시로 이어질 수 있어서 방어적으로 계속 지연 로딩한다.
function loadNotifications(): typeof import("expo-notifications") {
  return require("expo-notifications");
}

const PUSH_TOKEN_CACHE_KEY = "swayt-expo-push-token";
// "세트 완료 버튼을 깜빡하고 폰을 놓아버린" 경우를 잡기 위한 안전망 리마인드 간격.
const SET_TIMER_REMINDER_SECONDS = 15 * 60;

export const devicePlatform: DevicePlatform = Platform.OS === "ios" ? "IOS" : "ANDROID";

// 앱이 포그라운드에 있어도 로컬 알림이 배너/사운드로 뜨게 한다(기본값은 무시함).
// _layout.tsx에서 부팅 시 한 번 호출 — 원격 푸시 토큰 발급 없이 핸들러만 등록하는
// 작업이라 registerForPushNotificationsAsync와 달리 권한을 요구하지 않는다.
export function configureNotificationHandler(): void {
  const Notifications = loadNotifications();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// 세트 타이머 등 로컬 알림 전용 권한 확인/요청 — registerForPushNotificationsAsync와 달리
// 원격 push token 발급까지는 필요 없는 기능(순수 기기 내 예약 알림)이라 따로 둔다.
async function ensureLocalNotificationPermission(): Promise<boolean> {
  const Notifications = loadNotifications();
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

const SET_TIMER_REMINDER_TYPE = "set-timer-reminder";

// 세트 타이머를 "세트 시작"한 시점에 호출 — 리마인드 알림을 예약해두고,
// "세트 완료"를 누르면(cancelSetTimerReminder) 취소한다. 정확히 N분을 채운 실제 세트를
// 노리는 게 아니라 "완료 버튼 누르는 걸 깜빡하고 폰을 놓아버린" 경우를 잡기 위한 안전망이라,
// 화면 전환/백그라운드 전환과 무관하게 항상 실제 시각 기준으로 울려야 하는 로컬 알림이 맞다.
export async function scheduleSetTimerReminder(): Promise<string | null> {
  const granted = await ensureLocalNotificationPermission();
  if (!granted) return null;
  const Notifications = loadNotifications();
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "세트 완료를 깜빡하셨나요?",
      body: "타이머가 오래 돌아가고 있어요. 세트를 마쳤다면 앱에서 완료를 눌러주세요.",
      data: { type: SET_TIMER_REMINDER_TYPE },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: SET_TIMER_REMINDER_SECONDS,
    },
  });
}

export async function cancelSetTimerReminder(notificationId: string): Promise<void> {
  const Notifications = loadNotifications();
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

// 운동 종료 시점에 호출 — 마지막으로 활성화됐던 운동 말고도, 세트 완료 없이 다른 운동으로
// 넘어가버린 것들 때문에 예약만 되고 안 지워진 리마인드가 세션 안에 여러 개 남아있을 수
// 있다. JS 메모리에 id를 들고 있는 방식(SetTimer 컴포넌트별 ref)은 앱이 백그라운드에서
// 종료됐다 재실행되면 유실되므로, OS에 실제 예약된 알림 목록을 조회해 타입으로 걸러
// 한 번에 취소한다.
export async function cancelAllSetTimerReminders(): Promise<void> {
  const Notifications = loadNotifications();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const targets = scheduled.filter(
    (notification) => notification.content.data?.type === SET_TIMER_REMINDER_TYPE
  );
  await Promise.all(
    targets.map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier))
  );
}

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

  const Notifications = loadNotifications();

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
