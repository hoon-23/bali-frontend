import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { CARD_SHADOW } from "../../constants/shadow";
import {
  NotificationSettings,
  useNotificationSettings,
  useRegisterDeviceToken,
  useUpdateNotificationSettings,
} from "../../hooks/api/useNotifications";
import { devicePlatform, registerForPushNotificationsAsync } from "../../lib/notifications";

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
  const { data: settings } = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();
  const registerDeviceToken = useRegisterDeviceToken();

  const [permissionDenied, setPermissionDenied] = useState(false);
  const registerAttempted = useRef(false);

  useEffect(() => {
    if (registerAttempted.current) return;
    registerAttempted.current = true;
    (async () => {
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        setPermissionDenied(true);
        return;
      }
      registerDeviceToken.mutate({ token, platform: devicePlatform });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = (key: SettingKey, value: boolean) => {
    updateSettings.mutate({ [key]: value });
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>알림 설정</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          {permissionDenied && (
            <Pressable style={styles.warningCard} onPress={() => Linking.openSettings()}>
              <Ionicons name="notifications-off-outline" size={18} color="#FBBF24" />
              <Text style={styles.warningText}>
                기기 알림 권한이 꺼져 있어요. 눌러서 설정에서 켜주세요.
              </Text>
            </Pressable>
          )}

          <View style={styles.card}>
            {TOGGLE_ITEMS.map((item, index) => (
              <View
                key={item.key}
                style={[styles.toggleRow, index > 0 && styles.toggleRowDivider]}
              >
                <View style={styles.toggleTextGroup}>
                  <Text style={styles.toggleLabel}>{item.label}</Text>
                  <Text style={styles.toggleDescription}>{item.description}</Text>
                </View>
                <Switch
                  value={settings?.[item.key] ?? true}
                  onValueChange={(value) => handleToggle(item.key, value)}
                  trackColor={{ false: "#3A3A42", true: "rgba(45, 212, 191, 0.5)" }}
                  thumbColor={settings?.[item.key] ? "#2DD4BF" : "#A0A0A0"}
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
    backgroundColor: "#1C1C25",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    color: "#FFFFFF",
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
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(251, 191, 36, 0.35)",
    padding: 12,
  },
  warningText: {
    flex: 1,
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#1C1C25",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 16,
    ...CARD_SHADOW,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  toggleRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  toggleTextGroup: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  toggleDescription: {
    color: "#A0A0A0",
    fontSize: 12,
  },
});
