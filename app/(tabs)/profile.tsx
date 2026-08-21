import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN, TAB_BAR_BOTTOM_MARGIN, TAB_BAR_HEIGHT } from "../../constants/layout";
import { CARD_SHADOW } from "../../constants/shadow";
import { appAlert } from "../../lib/alert";
import { apiClient } from "../../lib/api/client";
import { getRefreshToken } from "../../lib/auth/tokenStorage";
import { useAuthStore } from "../../store/authStore";

const USER_NAME = "지훈";
const USER_EMAIL = "jihoon@bali.app";
const LEVEL = 5;
const EXP_CURRENT = 650;
const EXP_TARGET = 1000;

const TOTAL_WORKOUT_DAYS = 156;
const TOTAL_WORKOUT_TIME = "84h 20m";
const STREAK_DAYS = 12;

type SettingItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  danger?: boolean;
};

const SETTING_ITEMS: SettingItem[] = [
  { id: "notifications", icon: "notifications-outline", label: "알림 설정" },
  { id: "account", icon: "person-outline", label: "계정 정보" },
  { id: "privacy", icon: "document-text-outline", label: "개인정보처리방침" },
  { id: "logout", icon: "log-out-outline", label: "로그아웃", danger: true },
];

export default function ProfileScreen() {
  const router = useRouter();

  const handleConfirmLogout = async () => {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      try {
        await apiClient.post("/api/v1/auth/logout", { refreshToken });
      } catch {
        // 서버 로그아웃 실패해도 로컬 로그아웃은 계속 진행
      }
    }
    // 소셜 로그인이 가입/로그인을 겸하는 구조라, 구글 SDK 세션(GoogleSignin.signOut())까지
    // 지우지 않는다 — 앱 로그아웃은 우리 쪽 토큰만 지우고, 다음 로그인은 다시 빠르게 되게 둔다.
    useAuthStore.getState().logout();
    router.replace("/");
  };

  const handleSettingPress = (item: SettingItem) => {
    if (item.id === "logout") {
      appAlert("로그아웃", "로그아웃 하시겠습니까?", [
        { text: "취소", style: "cancel" },
        { text: "로그아웃", style: "destructive", onPress: handleConfirmLogout },
      ]);
      return;
    }
    if (item.id === "privacy") {
      router.push("/legal/privacy-policy");
    }
  };

  const expProgress = Math.min(100, (EXP_CURRENT / EXP_TARGET) * 100);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{USER_NAME[0]}</Text>
            </View>
            <Text style={styles.name}>{USER_NAME}님</Text>
            <Text style={styles.email}>{USER_EMAIL}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.levelRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>Lv.{LEVEL}</Text>
              </View>
              <Text style={styles.expText}>
                {EXP_CURRENT} / {EXP_TARGET} XP
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${expProgress}%` }]} />
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatTile label="총 운동일" value={`${TOTAL_WORKOUT_DAYS}일`} />
            <StatTile label="총 운동시간" value={TOTAL_WORKOUT_TIME} />
            <StatTile label="연속일" value={`${STREAK_DAYS}일`} />
          </View>

          <View style={styles.card}>
            {SETTING_ITEMS.map((item, index) => (
              <Pressable
                key={item.id}
                style={[styles.settingRow, index > 0 && styles.settingRowDivider]}
                onPress={() => handleSettingPress(item)}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={item.danger ? "#F87171" : "#A0A0A0"}
                />
                <Text style={[styles.settingLabel, item.danger && styles.settingLabelDanger]}>
                  {item.label}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#6B6B6B" />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

type StatTileProps = {
  value: string;
  label: string;
};

function StatTile({ value, label }: StatTileProps) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingTop: 12,
    paddingBottom: TAB_BAR_BOTTOM_MARGIN + TAB_BAR_HEIGHT + 24,
    gap: 20,
  },
  profileHeader: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 12,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(45, 212, 191, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: {
    color: "#2DD4BF",
    fontSize: 28,
    fontWeight: "700",
  },
  name: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  email: {
    color: "#A0A0A0",
    fontSize: 13,
  },
  card: {
    backgroundColor: "#1C1C25",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 16,
    gap: 12,
    ...CARD_SHADOW,
  },
  levelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  levelBadge: {
    backgroundColor: "rgba(45, 212, 191, 0.15)",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  levelBadgeText: {
    color: "#2DD4BF",
    fontSize: 13,
    fontWeight: "700",
  },
  expText: {
    color: "#A0A0A0",
    fontSize: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#2DD4BF",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statTile: {
    flex: 1,
    backgroundColor: "#1C1C25",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
    ...CARD_SHADOW,
  },
  statLabel: {
    color: "#A0A0A0",
    fontSize: 12,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  settingRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  settingLabel: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  settingLabelDanger: {
    color: "#F87171",
  },
});
