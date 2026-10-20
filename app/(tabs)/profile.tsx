import { AnimatedBar } from "../../components/AnimatedBar";
import { Bell, ChevronRight, Dumbbell, FileText, LogOut, LucideIcon, User } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { Skeleton } from "../../components/Skeleton";
import {
  IN_PROGRESS_BANNER_RESERVED_HEIGHT,
  SCREEN_HORIZONTAL_MARGIN,
  TAB_BAR_BOTTOM_MARGIN,
  TAB_BAR_HEIGHT,
} from "../../constants/layout";
import { SUBSCRIPTION_UI_ENABLED } from "../../constants/features";
import { CARD_SHADOW } from "../../constants/shadow";
import { appAlert } from "../../lib/alert";
import { apiClient } from "../../lib/api/client";
import { getRefreshToken } from "../../lib/auth/tokenStorage";
import { formatThousands } from "../../lib/format/number";
import { useAuthStore } from "../../store/authStore";
import { useInProgressSessionId } from "../../hooks/api/useInProgressSession";
import { isPlaceholderEmail, useMe } from "../../hooks/api/useMe";
import { clearCachedPushToken, getCachedPushToken } from "../../lib/notifications";


type SettingItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  danger?: boolean;
};

const SETTING_ITEMS: SettingItem[] = [
  { id: "notifications", icon: Bell, label: "알림 설정" },
  { id: "account", icon: User, label: "계정 정보" },
  { id: "myExercises", icon: Dumbbell, label: "내 운동 관리" },
  { id: "privacy", icon: FileText, label: "개인정보처리방침" },
  { id: "logout", icon: LogOut, label: "로그아웃", danger: true },
];

// 만료 시각(ISO)을 "YYYY.MM.DD" 로 표시 — 파싱 실패 시 null
function formatPlanExpiry(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  // isPending은 캐시에 데이터가 아직 없고 에러도 아닐 때만 true — 이때만 스켈레톤을 보인다.
  // 백그라운드 재조회 중에는 기존 값이 그대로 남아 깜빡이지 않는다.
  const { data: me, isPending: mePending } = useMe();
  const inProgressSessionId = useInProgressSessionId();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ focus?: string; t?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  // 구독 카드의 스크롤 내 y 위치 — "PRO 알아보기"로 들어왔을 때 이 위치로 스크롤한다.
  const subscriptionY = useRef(0);

  useEffect(() => {
    if (SUBSCRIPTION_UI_ENABLED && params.focus === "subscription") {
      scrollRef.current?.scrollTo({ y: Math.max(0, subscriptionY.current - 12), animated: true });
    }
  }, [params.focus, params.t]);

  // 플랜이 없는 구서버 응답은 FREE로 간주
  const isPro = me?.plan === "PRO";
  const planExpiresLabel = me?.planExpiresAt ? formatPlanExpiry(me.planExpiresAt) : null;

  const handleConfirmLogout = async () => {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      try {
        await apiClient.post("/api/v1/auth/logout", { refreshToken });
      } catch {
        // 서버 로그아웃 실패해도 로컬 로그아웃은 계속 진행
      }
    }
    const pushToken = await getCachedPushToken();
    if (pushToken) {
      try {
        await apiClient.delete("/api/v1/notifications/device-token", { data: { token: pushToken } });
      } catch {
        // 토큰 해제 실패해도 로컬 로그아웃은 계속 진행
      }
      await clearCachedPushToken();
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
    if (item.id === "account") {
      router.push("/account");
    }
    if (item.id === "myExercises") {
      router.push("/exercises");
    }
    if (item.id === "notifications") {
      router.push("/notifications/settings");
    }
  };

  // 값이 오기 전에도 배지/진행 바 자리는 그대로 두고 내용만 비워 레이아웃이 밀리지 않게 한다.
  const level = me?.level;
  const expProgress = level && level.xpForNextLevel > 0
    ? Math.min(100, (level.currentXp / level.xpForNextLevel) * 100)
    : 0;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scrollContent,
            {
              // SafeAreaView edges=["top"]이라 insets.bottom이 반영 안 돼 마지막 카드가
              // 탭바와 겹쳐 보이던 문제 — 여기서 insets.bottom을 더해 맞춘다.
              paddingBottom:
                insets.bottom +
                TAB_BAR_BOTTOM_MARGIN +
                TAB_BAR_HEIGHT +
                (inProgressSessionId ? IN_PROGRESS_BANNER_RESERVED_HEIGHT + 24 : 24),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              {/* 로딩 중에는 "?" 대신 빈 원만 둔다 */}
              {!mePending && <Text style={styles.avatarText}>{me?.nickname?.[0] ?? "?"}</Text>}
            </View>
            {mePending ? (
              <>
                {/* 닉네임(20pt)·이메일(13pt) 한 줄 높이에 맞춘 막대 */}
                <Skeleton width={110} height={20} style={styles.nameSkeleton} />
                <Skeleton width={150} height={13} style={styles.emailSkeleton} />
              </>
            ) : (
              <>
                <Text style={styles.name}>{me?.nickname ?? "—"} 님</Text>
                {me?.email && !isPlaceholderEmail(me.email) && (
                  <Text style={styles.email}>{me.email}</Text>
                )}
              </>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.levelRow}>
              {mePending ? (
                <>
                  {/* 레벨 배지(약 24px)·XP 문구(12pt) 크기에 맞춘 막대 */}
                  <Skeleton width={52} height={24} radius={12} />
                  <Skeleton width={96} height={12} />
                </>
              ) : (
                <>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelBadgeText}>Lv.{level?.level ?? "—"}</Text>
                  </View>
                  <Text style={styles.expText}>
                    {level ? `${formatThousands(level.currentXp)} / ${formatThousands(level.xpForNextLevel)} XP` : " "}
                  </Text>
                </>
              )}
            </View>
            <View style={styles.progressTrack}>
              <AnimatedBar progress={expProgress / 100} style={styles.progressFill} />
            </View>
          </View>

          {SUBSCRIPTION_UI_ENABLED && (
            <View
              style={styles.card}
              onLayout={(event) => {
                subscriptionY.current = event.nativeEvent.layout.y;
              }}
            >
              <View style={styles.levelRow}>
                <Text style={styles.settingLabel}>구독</Text>
                {mePending ? (
                  // 플랜을 모르는 동안 "무료"로 잘못 보이지 않게 배지 자리만 잡아 둔다.
                  <Skeleton width={52} height={24} radius={12} />
                ) : (
                  <View style={[styles.levelBadge, !isPro && styles.planBadgeFree]}>
                    <Text style={[styles.levelBadgeText, !isPro && styles.planBadgeFreeText]}>
                      {isPro ? "PRO" : "무료"}
                    </Text>
                  </View>
                )}
              </View>
              {mePending ? (
                // 대부분인 무료 플랜 모양(설명 2줄 + 버튼)에 맞춘 자리표시 — 업그레이드 문구를 미리 보이지 않는다.
                <>
                  <View>
                    <Skeleton height={13} style={styles.planLineSkeleton} />
                    <Skeleton width="60%" height={13} style={styles.planLineSkeleton} />
                  </View>
                  <Skeleton height={44} radius={12} />
                </>
              ) : isPro ? (
                <Text style={styles.planDescription} lineBreakStrategyIOS="hangul-word">
                  {planExpiresLabel ? `${planExpiresLabel}까지 이용할 수 있어요` : "PRO를 이용 중이에요"}
                </Text>
              ) : (
                <>
                  <Text style={styles.planDescription} lineBreakStrategyIOS="hangul-word">
                    PRO에서는 루틴과 직접 만든 운동을 한도 없이 만들고, 월간 인사이트를 볼 수 있어요.
                  </Text>
                  <Pressable
                    style={styles.proButton}
                    onPress={() => appAlert("곧 만나요", "PRO는 아직 준비 중이에요. 조금만 기다려주세요.")}
                  >
                    <Text style={styles.proButtonText}>PRO 시작하기</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}

          <View style={styles.card}>
            {SETTING_ITEMS.map((item, index) => (
              <Pressable
                key={item.id}
                style={[styles.settingRow, index > 0 && styles.settingRowDivider]}
                onPress={() => handleSettingPress(item)}
              >
                <item.icon
                  size={20}
                  color={item.danger ? "#F87171" : "#A0A0A0"}
                />
                <Text style={[styles.settingLabel, item.danger && styles.settingLabelDanger]}>
                  {item.label}
                </Text>
                <ChevronRight size={16} color="#6B6B6B" />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingTop: 12,
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
  // 20pt 한 줄 높이(약 24px)에 맞추기 위한 위아래 여백.
  nameSkeleton: {
    marginVertical: 2,
  },
  // 13pt 한 줄 높이(약 16px)에 맞추기 위한 위아래 여백.
  emailSkeleton: {
    marginVertical: 1.5,
  },
  // planDescription의 lineHeight(19)에 맞추기 위한 위아래 여백.
  planLineSkeleton: {
    marginVertical: 3,
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
  planBadgeFree: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  planBadgeFreeText: {
    color: "#A0A0A0",
  },
  planDescription: {
    color: "#A0A0A0",
    fontSize: 13,
    lineHeight: 19,
  },
  proButton: {
    backgroundColor: "#2DD4BF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  proButtonText: {
    color: "#0B0B0F",
    fontSize: 15,
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
