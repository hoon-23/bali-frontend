import { ChevronLeft, CircleMinus, CirclePlus } from "lucide-react-native";
import { colors } from "../../constants/theme";
import { PressableScale } from "../../components/ui/PressableScale";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppTextInput } from "../../components/AppTextInput";
import { dismissThen, KeyboardDismissView } from "../../components/KeyboardDismissView";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { appAlert } from "../../lib/alert";
import { apiClient } from "../../lib/api/client";
import { LAST_LOGIN_PROVIDER_KEY } from "../../lib/auth/lastLoginProvider";
import { useAuthStore } from "../../store/authStore";
import { isPlaceholderEmail, useMe, useUpdateProfile, useWithdraw } from "../../hooks/api/useMe";
import { clearCachedPushToken, getCachedPushToken } from "../../lib/notifications";

const NICKNAME_MAX_LENGTH = 20;
const WEEKLY_GOAL_MIN = 1;
const WEEKLY_GOAL_MAX = 7;

export default function AccountScreen() {
  const router = useRouter();
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();
  const withdraw = useWithdraw();

  const [nickname, setNickname] = useState("");
  const [weeklyGoal, setWeeklyGoal] = useState(WEEKLY_GOAL_MIN);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!me) return;
    setNickname(me.nickname);
    setWeeklyGoal(me.weeklyGoalSessions);
  }, [me]);

  const trimmedNickname = nickname.trim();
  const nicknameValid = trimmedNickname.length > 0 && trimmedNickname.length <= NICKNAME_MAX_LENGTH;
  const dirty = !!me && (trimmedNickname !== me.nickname || weeklyGoal !== me.weeklyGoalSessions);

  const handleSave = async () => {
    if (!nicknameValid) {
      appAlert("닉네임을 확인해주세요", `1자 이상 ${NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`);
      return;
    }
    setSaving(true);
    try {
      await updateProfile.mutateAsync({ nickname: trimmedNickname, weeklyGoalSessions: weeklyGoal });
      appAlert("저장했어요", undefined, [{ text: "확인", onPress: () => router.back() }]);
    } catch {
      appAlert("저장하지 못했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  // 네이버 SDK는 자체 토큰과 동의 상태를 기기에 남겨서, 탈퇴 후에도 로그인 버튼이 재인증 없이 바로 통과한다.
  // 탈퇴가 끝난 뒤 연동을 해제해 다음 로그인 때 네이버 로그인·동의 화면이 다시 뜨게 한다(실패해도 탈퇴는 이미 끝났다).
  const unlinkNaverIfNeeded = async () => {
    try {
      if ((await AsyncStorage.getItem(LAST_LOGIN_PROVIDER_KEY)) !== "naver") return;
      const NaverLogin = require("@react-native-seoul/naver-login").default;
      await NaverLogin.deleteToken();
    } catch (error) {
      console.warn("네이버 연동 해제 실패", error);
    }
  };

  const handleWithdraw = () => {
    appAlert(
      "정말 탈퇴하시겠어요?",
      "탈퇴 즉시 계정 정보와 운동 기록에 대한 접근이 사라지며\n되돌릴 수 없어요.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴하기",
          style: "destructive",
          onPress: async () => {
            try {
              const pushToken = await getCachedPushToken();
              if (pushToken) {
                try {
                  await apiClient.delete("/api/v1/notifications/device-token", { data: { token: pushToken } });
                } catch {
                  // 토큰 해제 실패해도 탈퇴는 계속 진행
                }
                await clearCachedPushToken();
              }
              await withdraw.mutateAsync();
              await unlinkNaverIfNeeded();
              useAuthStore.getState().logout();
              router.replace("/");
            } catch {
              appAlert("탈퇴에 실패했어요. 다시 시도해주세요.");
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenBackground>
      <KeyboardDismissView>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <PressableScale style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={20} color={colors.text} />
          </PressableScale>
          <Text style={styles.headerTitle}>계정 정보</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>이메일</Text>
            <Text style={styles.readonlyValue}>
              {me?.email && !isPlaceholderEmail(me.email) ? me.email : "—"}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>닉네임</Text>
            <AppTextInput
              style={[styles.input, !nicknameValid && styles.inputError]}
              value={nickname}
              onChangeText={setNickname}
              maxLength={NICKNAME_MAX_LENGTH}
              placeholder="닉네임"
              placeholderTextColor={colors.text3}
            />
            <Text style={styles.fieldHint}>
              {trimmedNickname.length}/{NICKNAME_MAX_LENGTH}자
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>주간 목표 운동 횟수</Text>
            <View style={styles.stepperRow}>
              <PressableScale
                style={styles.stepperButton}
                onPress={dismissThen(() => setWeeklyGoal((v) => Math.max(WEEKLY_GOAL_MIN, v - 1)))}
                disabled={weeklyGoal <= WEEKLY_GOAL_MIN}
                hitSlop={8}
              >
                <CircleMinus
                  size={28}
                  color={weeklyGoal <= WEEKLY_GOAL_MIN ? "#3A3A42" : "#2DD4BF"}
                />
              </PressableScale>
              <Text style={styles.stepperValue}>주 {weeklyGoal}회</Text>
              <PressableScale
                style={styles.stepperButton}
                onPress={dismissThen(() => setWeeklyGoal((v) => Math.min(WEEKLY_GOAL_MAX, v + 1)))}
                disabled={weeklyGoal >= WEEKLY_GOAL_MAX}
                hitSlop={8}
              >
                <CirclePlus
                  size={28}
                  color={weeklyGoal >= WEEKLY_GOAL_MAX ? "#3A3A42" : "#2DD4BF"}
                />
              </PressableScale>
            </View>
          </View>

          <PressableScale
            style={[styles.saveButton, (!dirty || saving) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!dirty || saving}
          >
            <Text style={styles.saveButtonText}>{saving ? "저장하는 중..." : "저장"}</Text>
          </PressableScale>

          <PressableScale style={styles.withdrawButton} onPress={handleWithdraw}>
            <Text style={styles.withdrawButtonText}>회원 탈퇴</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
      </KeyboardDismissView>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  fieldLabel: {
    color: colors.text2,
    fontSize: 12,
    fontWeight: "600",
  },
  readonlyValue: {
    color: colors.text3,
    fontSize: 15,
  },
  input: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 4,
  },
  inputError: {
    color: colors.danger,
  },
  fieldHint: {
    color: colors.text3,
    fontSize: 11,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepperButton: {
    padding: 4,
  },
  stepperValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: colors.track,
  },
  saveButtonText: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: "700",
  },
  withdrawButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  withdrawButtonText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "600",
  },
});
