import { ChevronLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { liveActivity } from "../../modules/swayt-live-activity";

// 잠금화면 버튼(Live Activity)이 어디까지 동작했는지 확인하는 진단 화면. 프로필 닉네임을 길게 누르면 열린다.
// 실기기(TestFlight)는 콘솔을 볼 수 없어서, 버튼을 눌렀을 때 인텐트가 어느 프로세스에서 실행됐는지,
// 어디서 멈췄는지를 App Group에 남긴 로그로 확인한다. "공유"로 로그 전체를 보낼 수 있다.

type PlanInfo = { rev?: number; updatedBy?: string; updatedAt?: string; sessionId?: string; logs?: unknown[] } | null;

function readPlanInfo(): PlanInfo {
  const raw = liveActivity.readPlan();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const TEST_ACTIONS: [string, string][] = [
  ["startSet", "세트 시작"],
  ["completeSet", "세트 완료"],
  ["startCardio", "측정 시작"],
  ["pauseCardio", "일시정지"],
  ["resumeCardio", "이어서"],
  ["finishCardio", "유산소 종료"],
];

export default function LiveActivityDiagnosticsScreen() {
  const router = useRouter();
  const [lines, setLines] = useState<string[]>([]);
  const [plan, setPlan] = useState<PlanInfo>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [supported, setSupported] = useState(false);

  const refresh = useCallback(() => {
    setLines(liveActivity.readDebugLog().slice().reverse());
    setPlan(readPlanInfo());
    setActiveCount(liveActivity.activeIds().length);
    setSupported(liveActivity.isSupported());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const summary = [
    `Live Activity 사용 가능: ${supported ? "예" : "아니요"}`,
    `떠 있는 Live Activity: ${activeCount}개`,
    plan
      ? `plan: rev ${plan.rev ?? "?"} · 마지막 작성 ${plan.updatedBy ?? "?"} · ${plan.updatedAt ?? "?"} · 종목 ${plan.logs?.length ?? 0}개`
      : "plan: 없음(진행 중인 운동이 없거나 App Group에 쓰이지 않음)",
  ];

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Live Activity 진단</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.summaryBox}>
          {summary.map((line) => (
            <Text key={line} style={styles.summaryText}>
              {line}
            </Text>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.actionButton} onPress={refresh}>
            <Text style={styles.actionText}>새로고침</Text>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() => Share.share({ message: [...summary, "", ...lines.slice().reverse()].join("\n") })}
          >
            <Text style={styles.actionText}>공유</Text>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() => {
              liveActivity.clearDebugLog();
              refresh();
            }}
          >
            <Text style={styles.actionText}>로그 지우기</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>동작 시험 (버튼 탭이 실행하는 것과 같은 코드를 직접 실행)</Text>
        <View style={styles.testRow}>
          {TEST_ACTIONS.map(([action, label]) => (
            <Pressable
              key={action}
              style={styles.testButton}
              onPress={async () => {
                await liveActivity.debugPerform(action);
                refresh();
              }}
            >
              <Text style={styles.testText}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.logContent}>
          {lines.length === 0 ? (
            <Text style={styles.emptyText}>
              기록된 로그가 없어요. 잠금화면의 세트 시작/완료 버튼을 누른 뒤 새로고침하세요. 버튼을 눌렀는데도
              로그가 비어 있다면 인텐트가 아예 실행되지 않은 것입니다.
            </Text>
          ) : (
            lines.map((line, index) => (
              <Text key={`${index}-${line}`} style={styles.logLine} selectable>
                {line}
              </Text>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1C1C25",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  headerSpacer: { width: 40 },
  summaryBox: {
    marginHorizontal: SCREEN_HORIZONTAL_MARGIN,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#1C1C25",
    gap: 4,
  },
  summaryText: { color: "#FFFFFF", fontSize: 13 },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: SCREEN_HORIZONTAL_MARGIN,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1C1C25",
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { color: "#2DD4BF", fontSize: 14, fontWeight: "600" },
  sectionLabel: { color: "#A0A0A0", fontSize: 11, marginHorizontal: SCREEN_HORIZONTAL_MARGIN, marginTop: 14 },
  testRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginHorizontal: SCREEN_HORIZONTAL_MARGIN, marginTop: 6 },
  testButton: { paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: "#1C1C25", alignItems: "center", justifyContent: "center" },
  testText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  logContent: { padding: SCREEN_HORIZONTAL_MARGIN, gap: 6 },
  logLine: { color: "#D0D0D0", fontSize: 11, fontFamily: "Menlo" },
  emptyText: { color: "#A0A0A0", fontSize: 13, lineHeight: 19 },
});
