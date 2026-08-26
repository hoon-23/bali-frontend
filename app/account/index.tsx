import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { CARD_SHADOW } from "../../constants/shadow";
import { appAlert } from "../../lib/alert";
import { apiClient } from "../../lib/api/client";
import { useAuthStore } from "../../store/authStore";
import { useMe, useUpdateProfile, useWithdraw } from "../../hooks/api/useMe";
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

  const handleWithdraw = () => {
    appAlert(
      "정말 탈퇴하시겠어요?",
      "탈퇴 즉시 계정 정보와 운동 기록에 대한 접근이 사라지며 되돌릴 수 없어요.",
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
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>계정 정보</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>이메일</Text>
            <Text style={styles.readonlyValue}>{me?.email ?? "—"}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>닉네임</Text>
            <TextInput
              style={[styles.input, !nicknameValid && styles.inputError]}
              value={nickname}
              onChangeText={setNickname}
              maxLength={NICKNAME_MAX_LENGTH}
              placeholder="닉네임"
              placeholderTextColor="#6B6B6B"
            />
            <Text style={styles.fieldHint}>
              {trimmedNickname.length}/{NICKNAME_MAX_LENGTH}자
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>주간 목표 운동 횟수</Text>
            <View style={styles.stepperRow}>
              <Pressable
                style={styles.stepperButton}
                onPress={() => setWeeklyGoal((v) => Math.max(WEEKLY_GOAL_MIN, v - 1))}
                disabled={weeklyGoal <= WEEKLY_GOAL_MIN}
                hitSlop={8}
              >
                <Ionicons
                  name="remove-circle-outline"
                  size={28}
                  color={weeklyGoal <= WEEKLY_GOAL_MIN ? "#3A3A42" : "#2DD4BF"}
                />
              </Pressable>
              <Text style={styles.stepperValue}>주 {weeklyGoal}회</Text>
              <Pressable
                style={styles.stepperButton}
                onPress={() => setWeeklyGoal((v) => Math.min(WEEKLY_GOAL_MAX, v + 1))}
                disabled={weeklyGoal >= WEEKLY_GOAL_MAX}
                hitSlop={8}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={28}
                  color={weeklyGoal >= WEEKLY_GOAL_MAX ? "#3A3A42" : "#2DD4BF"}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.saveButton, (!dirty || saving) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!dirty || saving}
          >
            <Text style={styles.saveButtonText}>{saving ? "저장하는 중..." : "저장"}</Text>
          </Pressable>

          <Pressable style={styles.withdrawButton} onPress={handleWithdraw}>
            <Text style={styles.withdrawButtonText}>회원 탈퇴</Text>
          </Pressable>
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
  card: {
    backgroundColor: "#1C1C25",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 16,
    gap: 8,
    ...CARD_SHADOW,
  },
  fieldLabel: {
    color: "#A0A0A0",
    fontSize: 12,
    fontWeight: "600",
  },
  readonlyValue: {
    color: "#6B6B6B",
    fontSize: 15,
  },
  input: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 4,
  },
  inputError: {
    color: "#F87171",
  },
  fieldHint: {
    color: "#6B6B6B",
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
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: "#2DD4BF",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "rgba(45, 212, 191, 0.3)",
  },
  saveButtonText: {
    color: "#0B0B0F",
    fontSize: 16,
    fontWeight: "700",
  },
  withdrawButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  withdrawButtonText: {
    color: "#F87171",
    fontSize: 13,
    fontWeight: "600",
  },
});
