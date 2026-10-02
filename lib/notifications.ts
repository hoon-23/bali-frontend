import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import type { Router } from "expo-router";
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
      // 서버 푸시가 badge(안 읽은 알림 수)를 실어 보내므로 포그라운드에서 받아도 아이콘 숫자에 반영한다.
      shouldSetBadge: true,
    }),
  });
}

// 앱 아이콘 뱃지를 안 읽은 알림 수에 맞춘다(0이면 지움). 서버는 푸시를 보낼 때만 숫자를 바꿀 수 있어서,
// 앱 안에서 읽음 처리했거나 포그라운드로 돌아왔을 때는 프론트가 직접 맞춰야 한다.
// 알림 권한이 없으면 OS가 무시하고, 실패해도 화면 동작에는 영향이 없어 조용히 넘긴다.
export function setAppIconBadgeCount(count: number): void {
  try {
    loadNotifications().setBadgeCountAsync(Math.max(0, count)).catch(() => {});
  } catch {
    // 네이티브 모듈이 없는 런타임(Expo Go 등)
  }
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

export type NotificationPermission = "granted" | "denied" | "undetermined";

// 현재 기기 알림 권한 상태 — 권한 요청 팝업을 띄우지 않고 조회만 한다.
export async function getNotificationPermission(): Promise<NotificationPermission> {
  const Notifications = loadNotifications();
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

// 서버 푸시 data({ type, referenceId })로 탭했을 때 이동할 화면을 정한다 — 알림함 항목과 같은 값이다.
// 로컬 알림(세트 타이머 등)이나 알 수 없는 type이면 null(화면 이동 없음).
// referenceId: ROUTINE_REMINDER=세션 id, WEEKLY/MONTHLY_SUMMARY=분석 id, INACTIVITY_ALERT=빈 문자열.
export function getPushTapRoute(data: Record<string, unknown> | undefined): string | null {
  const type = data?.type;
  const referenceId = typeof data?.referenceId === "string" ? data.referenceId : "";
  switch (type) {
    case "ROUTINE_REMINDER":
      return referenceId ? `/upcoming/${referenceId}` : "/home";
    case "WEEKLY_SUMMARY":
    case "MONTHLY_SUMMARY":
      return "/stats";
    case "INACTIVITY_ALERT":
      return "/home";
    default:
      return null;
  }
}

// getPushTapRoute가 돌려준 경로로 이동한다.
// 탭 경로(/home, /stats)를 스택 화면(알림함 등)에서 push하면 루트 Stack에 (tabs)가 하나 더 쌓여
// 애니메이션 없이 화면이 뚝 바뀐다 — 기존 (tabs)까지 되돌아가며 탭만 바꾸도록 dismissTo를 쓴다.
export function openPushTapRoute(router: Pick<Router, "push" | "dismissTo">, route: string): void {
  if (route === "/home" || route === "/stats") {
    router.dismissTo(route);
  } else {
    router.push(route as never);
  }
}

type NotificationTap = { identifier: string; route: string };

function toNotificationTap(
  response: import("expo-notifications").NotificationResponse | null | undefined
): NotificationTap | null {
  if (!response) return null;
  const route = getPushTapRoute(response.notification.request.content.data);
  return route ? { identifier: response.notification.request.identifier, route } : null;
}

// 푸시를 탭한 순간(앱이 켜져 있거나 백그라운드)의 이동 요청을 구독한다. 해제 함수를 돌려준다.
export function subscribeToNotificationTaps(onTap: (tap: NotificationTap) => void): () => void {
  const Notifications = loadNotifications();
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const tap = toNotificationTap(response);
    if (tap) onTap(tap);
  });
  return () => subscription.remove();
}

// 앱이 완전히 종료된 상태에서 푸시를 탭해 시작된 경우(콜드 스타트)의 이동 요청.
export async function getInitialNotificationTap(): Promise<NotificationTap | null> {
  const Notifications = loadNotifications();
  return toNotificationTap(await Notifications.getLastNotificationResponseAsync());
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
