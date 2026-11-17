import AsyncStorage from "@react-native-async-storage/async-storage";
import { AnimatedBar } from "../../components/AnimatedBar";
import { Bell, ChevronRight, Dumbbell, FileText, LogOut, LucideIcon, User } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useScrollToTop } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../../components/AppText";
import { ScreenBackground } from "../../components/ScreenBackground";
import { PressableScale } from "../../components/ui/PressableScale";
import { QuietButton } from "../../components/ui/QuietButton";
import { Skeleton } from "../../components/Skeleton";
import {
  IN_PROGRESS_BANNER_RESERVED_HEIGHT,
  SCREEN_HORIZONTAL_MARGIN,
  TAB_BAR_BOTTOM_MARGIN,
  TAB_BAR_HEIGHT,
} from "../../constants/layout";
import { SUBSCRIPTION_UI_ENABLED } from "../../constants/features";
import { colors, radius, space, type } from "../../constants/theme";
import { appAlert } from "../../lib/alert";
import { apiClient } from "../../lib/api/client";
import { LAST_LOGIN_PROVIDER_KEY } from "../../lib/auth/lastLoginProvider";
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
  // 이미 선택된 탭을 다시 누르면 맨 위로 올라간다.
  useScrollToTop(scrollRef);
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
    // 구글 SDK 세션(GoogleSignin.signOut())은 지우지 않는다 — 구글은 로그인 때 계정 선택 창이 다시 뜬다.
    // 네이버 SDK는 토큰을 기기에 남겨 두고 다음 로그인을 재인증 없이 통과시켜서, 다른 계정으로 바꿔 로그인할 수 없다.
    // 그래서 네이버로 로그인했다면 연동을 해제해 다음 로그인 때 네이버 로그인 화면이 다시 뜨게 한다.
    try {
      if ((await AsyncStorage.getItem(LAST_LOGIN_PROVIDER_KEY)) === "naver") {
        const NaverLogin = require("@react-native-seoul/naver-login").default;
        try {
          await NaverLogin.deleteToken();
        } catch {
          // 서버 연동 해제가 실패하면 최소한 기기에 남은 토큰이라도 지운다
          await NaverLogin.logout();
        }
      }
    } catch {
      // 네이버 정리 실패해도 로컬 로그아웃은 계속 진행
    }
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
              // SafeAreaView edges=["top"]이라 insets.bottom이 반영 안 돼 마지막 항목이
              // 탭바와 겹쳐 보이던 문제 — 여기서 insets.bottom을 더해 맞춘다.
              paddingBottom:
                insets.bottom +
                TAB_BAR_BOTTOM_MARGIN +
                TAB_BAR_HEIGHT +
                (inProgressSessionId ? IN_PROGRESS_BANNER_RESERVED_HEIGHT + space.s24 : space.s24),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View>
            {mePending ? (
              <>
                {/* 닉네임(title)·이메일(body) 한 줄 높이에 맞춘 막대 */}
                <Skeleton width={140} height={32} style={styles.nameSkeleton} />
                <Skeleton width={170} height={15} style={styles.emailSkeleton} />
              </>
            ) : (
              <>
                <AppText style={styles.name} numberOfLines={1}>
                  {me?.nickname ?? "—"} 님
                </AppText>
                {/* 이메일이 없어도 같은 높이를 잡아 아래가 밀리지 않게 한다. */}
                <AppText style={styles.email} numberOfLines={1}>
                  {me?.email && !isPlaceholderEmail(me.email) ? me.email : " "}
                </AppText>
              </>
            )}

            <View style={styles.levelRow}>
              {mePending ? (
                <Skeleton width={150} height={13} />
              ) : (
                <AppText style={styles.levelText}>
                  Lv.{level?.level ?? "—"}
                  {level ? ` · ${formatThousands(level.currentXp)} / ${formatThousands(level.xpForNextLevel)} XP` : ""}
                </AppText>
              )}
            </View>
            <View style={styles.progressTrack}>
              <AnimatedBar progress={expProgress / 100} style={styles.progressFill} />
            </View>
          </View>

          {SUBSCRIPTION_UI_ENABLED && (
            <View
              style={styles.subscription}
              onLayout={(event) => {
                subscriptionY.current = event.nativeEvent.layout.y;
              }}
            >
              <View style={styles.subscriptionHeader}>
                <AppText style={styles.sectionLabel}>구독</AppText>
                {mePending ? (
                  // 플랜을 모르는 동안 "무료"로 잘못 보이지 않게 자리만 잡아 둔다.
                  <Skeleton width={40} height={13} />
                ) : (
                  <AppText style={styles.planName}>{isPro ? "PRO" : "무료"}</AppText>
                )}
              </View>
              {mePending ? (
                // 대부분인 무료 플랜 모양(설명 2줄 + 버튼)에 맞춘 자리표시 — 업그레이드 문구를 미리 보이지 않는다.
                <>
                  <View>
                    <Skeleton height={15} style={styles.planLineSkeleton} />
                    <Skeleton width="60%" height={15} style={styles.planLineSkeleton} />
                  </View>
                  <Skeleton height={52} radius={radius.control} />
                </>
              ) : isPro ? (
                <AppText style={styles.planDescription}>
                  {planExpiresLabel ? `${planExpiresLabel}까지 이용할 수 있어요` : "PRO를 이용 중이에요"}
                </AppText>
              ) : (
                <>
                  <AppText style={styles.planDescription}>
                    PRO에서는 루틴과 직접 만든 운동을 한도 없이 만들고, 월간 인사이트를 볼 수 있어요.
                  </AppText>
                  <QuietButton
                    title="PRO 시작하기"
                    onPress={() => appAlert("곧 만나요", "PRO는 아직 준비 중이에요. 조금만 기다려주세요.")}
                  />
                </>
              )}
            </View>
          )}

          {/* 설정 목록 — 상자 없이 얇은 선으로만 나눈다. */}
          <View>
            {SETTING_ITEMS.map((item) => (
              <PressableScale
                key={item.id}
                style={styles.settingRow}
                onPress={() => handleSettingPress(item)}
                accessibilityRole="button"
              >
                <item.icon size={20} color={item.danger ? colors.danger : colors.text2} />
                <AppText style={[styles.settingLabel, item.danger && styles.settingLabelDanger]}>{item.label}</AppText>
                <ChevronRight size={16} color={colors.text3} />
              </PressableScale>
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
    paddingTop: space.s12,
    gap: space.s32,
  },
  name: {
    ...type.title,
    color: colors.text,
    letterSpacing: -0.6,
    lineHeight: 40,
  },
  // title 한 줄 높이(40)에 맞춘다.
  nameSkeleton: {
    marginVertical: 4,
  },
  email: {
    ...type.body,
    color: colors.text2,
    lineHeight: 20,
    marginTop: space.s4,
  },
  // 이메일 한 줄(20) + 위 여백(4)에 맞춘다.
  emailSkeleton: {
    marginTop: 6.5,
    marginBottom: 2.5,
  },
  levelRow: {
    height: 18,
    justifyContent: "center",
    marginTop: space.s20,
  },
  levelText: {
    ...type.label,
    color: colors.text2,
    fontVariant: ["tabular-nums"],
  },
  progressTrack: {
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
    overflow: "hidden",
    marginTop: space.s8,
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.text,
  },
  subscription: {
    gap: space.s12,
  },
  subscriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLabel: {
    ...type.meta,
    color: colors.text3,
  },
  planName: {
    ...type.label,
    color: colors.text,
  },
  planDescription: {
    ...type.body,
    color: colors.text2,
    lineHeight: 21,
  },
  planLineSkeleton: {
    marginVertical: 3,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.s12,
    minHeight: 52,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.16)",
  },
  settingLabel: {
    ...type.body,
    color: colors.text,
    flex: 1,
  },
  settingLabelDanger: {
    color: colors.danger,
  },
});
