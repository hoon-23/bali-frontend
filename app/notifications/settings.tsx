import { BellOff, ChevronLeft } from "lucide-react-native";
import { colors } from "../../constants/theme";
import { PressableScale } from "../../components/ui/PressableScale";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, Linking, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import {
  NotificationSettings,
  useNotificationSettings,
  useRegisterDeviceToken,
  useUpdateNotificationSettings,
} from "../../hooks/api/useNotifications";
import { appAlert } from "../../lib/alert";
import {
  devicePlatform,
  getNotificationPermission,
  NotificationPermission,
  registerForPushNotificationsAsync,
} from "../../lib/notifications";
import { AppText } from "../../components/AppText";

type SettingKey = keyof NotificationSettings;

const TOGGLE_ITEMS: { key: SettingKey; label: string; description: string }[] = [
  {
    key: "routineReminderEnabled",
    label: "루틴 예약 리마인더",
    description: "예약한 루틴 시작 전에 알려드려요",
  },
  {
    key: "inactivityAlertEnabled",
    label: "운동 미실행 알림",
    description: "예약한 루틴을 놓쳤거나 한동안 운동을 쉬면 알려드려요",
  },
  {
    key: "summaryNotificationEnabled",
    label: "주간·월간 요약",
    description: "한 주/한 달 운동 통계를 요약해드려요",
  },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { data: settings, isError: settingsLoadFailed, refetch } = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();
  const registerDeviceToken = useRegisterDeviceToken();

  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const permissionDenied = permission === "denied";

  // 화면 진입 시, 그리고 iOS 설정 앱에서 권한을 바꾸고 돌아왔을 때(앱이 다시 active) 권한 상태를
  // 다시 확인한다. 허용돼 있으면 토큰도 (재)등록한다 — 서버는 token 기준 upsert라 안전하다.
  useEffect(() => {
    const refreshPermission = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        setPermission(await getNotificationPermission());
        if (token) registerDeviceToken.mutate({ token, platform: devicePlatform });
      } catch (error) {
        console.warn("알림 권한 확인 실패", error);
      }
    };
    refreshPermission();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshPermission();
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = (key: SettingKey, value: boolean) => {
    updateSettings.mutate({ [key]: value });
    // 서버 수신 설정을 켜도 기기 권한이 꺼져 있으면 푸시가 오지 않는다 — iOS 설정으로 안내한다.
    if (value && permissionDenied) {
      appAlert("기기 알림이 꺼져 있어요", "알림을 받으려면 iOS 설정에서 Swayt의 알림을 허용해주세요.", [
        { text: "나중에", style: "cancel" },
        { text: "설정으로 이동", onPress: () => Linking.openSettings() },
      ]);
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <PressableScale style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={20} color={colors.text} />
          </PressableScale>
          <Text style={styles.headerTitle}>알림 설정</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          {permissionDenied && (
            <PressableScale style={styles.warningCard} onPress={() => Linking.openSettings()}>
              <BellOff size={18} color={colors.warn} />
              <AppText style={styles.warningText}>
                기기 알림 권한이 꺼져 있어요. 눌러서 설정에서 켜주세요.
              </AppText>
            </PressableScale>
          )}

          {settingsLoadFailed && (
            <PressableScale style={styles.warningCard} onPress={() => refetch()}>
              <BellOff size={18} color={colors.warn} />
              <AppText style={styles.warningText}>설정을 불러오지 못했어요. 눌러서 다시 시도해주세요.</AppText>
            </PressableScale>
          )}

          {updateSettings.isError && (
            <AppText style={styles.warningText}>변경을 저장하지 못했어요. 잠시 후 다시 시도해주세요.</AppText>
          )}

          <View style={styles.card}>
            {TOGGLE_ITEMS.map((item, index) => (
              <View
                key={item.key}
                style={[styles.toggleRow, index > 0 && styles.toggleRowDivider]}
              >
                <View style={styles.toggleTextGroup}>
                  <Text style={styles.toggleLabel}>{item.label}</Text>
                  <AppText style={styles.toggleDescription}>{item.description}</AppText>
                </View>
                <Switch
                  value={settings?.[item.key] ?? false}
                  disabled={!settings}
                  onValueChange={(value) => handleToggle(item.key, value)}
                  trackColor={{ false: colors.track, true: colors.text2 }}
                  thumbColor={settings?.[item.key] ? colors.text : colors.text2}
                />
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingBottom: 24,
    gap: 16,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.warn,
    padding: 12,
  },
  warningText: {
    flex: 1,
    color: colors.warn,
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  toggleRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  toggleTextGroup: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  toggleDescription: {
    color: colors.text2,
    fontSize: 12,
  },
});
