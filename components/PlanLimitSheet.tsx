import { Lock } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SUBSCRIPTION_UI_ENABLED } from "../constants/features";
import { PlanLimit } from "../lib/api/planLimit";

// 한도 종류별 안내 문구. 한도 숫자는 서버 설정으로 바뀌므로 문구에 넣지 않는다.
// 구독 UI 플래그가 꺼져 있으면 PRO/구독을 암시하지 않는 중립 문구를 쓴다(PLAN_LIMIT_NEUTRAL_COPY).
const PLAN_LIMIT_PRO_COPY: Record<PlanLimit, { title: string; description: string }> = {
  TEMPLATE_COUNT: {
    title: "무료 플랜에서는 루틴을 더 만들 수 없어요",
    description: "기존 루틴은 그대로 사용하고 수정할 수 있어요. 더 만들려면 PRO가 필요해요.",
  },
  PERSONAL_EXERCISE_COUNT: {
    title: "직접 만든 운동 한도에 도달했어요",
    description: "직접 만든 운동을 삭제하거나, PRO로 더 많이 만들 수 있어요.",
  },
  MONTHLY_INSIGHTS: {
    title: "월간 인사이트는 PRO에서 볼 수 있어요",
    description: "주간 리포트와 일별 기록은 계속 무료로 볼 수 있어요.",
  },
};

const PLAN_LIMIT_NEUTRAL_COPY: Record<PlanLimit, { title: string; description: string }> = {
  TEMPLATE_COUNT: {
    title: "루틴을 더 만들 수 없어요",
    description: "기존 루틴은 그대로 사용하고 수정할 수 있어요.",
  },
  PERSONAL_EXERCISE_COUNT: {
    title: "직접 만든 운동을 더 만들 수 없어요",
    description: "직접 만든 운동을 삭제하면 새로 만들 수 있어요.",
  },
  MONTHLY_INSIGHTS: {
    title: "이 기능은 현재 이용할 수 없어요",
    description: "주간 리포트와 일별 기록은 계속 볼 수 있어요.",
  },
};

export const PLAN_LIMIT_COPY = SUBSCRIPTION_UI_ENABLED ? PLAN_LIMIT_PRO_COPY : PLAN_LIMIT_NEUTRAL_COPY;

// 프로필 탭의 구독 영역으로 이동. 모달(루틴 만들기/운동 추가) 위에서도 호출되므로
// 쌓인 모달을 닫으면서 프로필 탭으로 간다. focus 파라미터로 프로필이 구독 카드로 스크롤한다.
export function useGoToSubscription() {
  const router = useRouter();
  return () =>
    router.dismissTo({ pathname: "/(tabs)/profile", params: { focus: "subscription", t: String(Date.now()) } });
}

type Props = {
  limit: PlanLimit | null;
  onClose: () => void;
};

// 한도 초과(403 LIMIT_EXCEEDED) 안내 하단 시트.
// presentation:"modal" 네이티브 모달 화면 위에서는 RN <Modal>이 AppAlertModal과 같은 문제를
// 겪을 수 있어서, 같은 뷰 트리 최상단 absolute overlay로 그린다(화면 루트에 마운트해서 사용).
export function PlanLimitSheet({ limit, onClose }: Props) {
  const goToSubscription = useGoToSubscription();
  if (!limit) return null;
  const copy = PLAN_LIMIT_COPY[limit];

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <SafeAreaView edges={["bottom"]} style={styles.sheet}>
        <View style={styles.iconWrap}>
          <Lock size={22} color="#2DD4BF" />
        </View>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.description} lineBreakStrategyIOS="hangul-word">{copy.description}</Text>
        {SUBSCRIPTION_UI_ENABLED && (
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              onClose();
              goToSubscription();
            }}
          >
            <Text style={styles.primaryButtonText}>PRO 알아보기</Text>
          </Pressable>
        )}
        <Pressable style={styles.secondaryButton} onPress={onClose} hitSlop={8}>
          <Text style={styles.secondaryButtonText}>닫기</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

// 리포트 월간 뷰처럼 "그 자리"를 대체하는 인라인 잠금 카드.
export function PlanLockCard({ limit }: { limit: PlanLimit }) {
  const goToSubscription = useGoToSubscription();
  const copy = PLAN_LIMIT_COPY[limit];
  return (
    <View style={styles.lockCard}>
      <View style={styles.iconWrap}>
        <Lock size={22} color="#2DD4BF" />
      </View>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.description} lineBreakStrategyIOS="hangul-word">{copy.description}</Text>
      {SUBSCRIPTION_UI_ENABLED && (
        <Pressable style={styles.primaryButton} onPress={goToSubscription}>
          <Text style={styles.primaryButtonText}>PRO 알아보기</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1100,
    elevation: 1100,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  sheet: {
    backgroundColor: "#1C1C25",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
    alignItems: "center",
    gap: 10,
  },
  lockCard: {
    backgroundColor: "#1C1C25",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(45, 212, 191, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    color: "#A0A0A0",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  primaryButton: {
    alignSelf: "stretch",
    backgroundColor: "#2DD4BF",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#0B0B0F",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: "#A0A0A0",
    fontSize: 14,
    fontWeight: "600",
  },
});
