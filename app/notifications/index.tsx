import { BellOff, ChevronLeft } from "lucide-react-native";
import { colors } from "../../constants/theme";
import { PressableScale } from "../../components/ui/PressableScale";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { getPushTapRoute, openPushTapRoute } from "../../lib/notifications";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import {
  InboxNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationInbox,
} from "../../hooks/api/useNotificationInbox";
import { AppText } from "../../components/AppText";

// "방금 전 / N분 전 / N시간 전 / N일 전 / M월 D일" — 알림 목록에서 흔히 쓰는 상대 시각 표기.
function formatRelativeTime(sentAt: string): string {
  const diffMinutes = Math.floor((Date.now() - new Date(sentAt).getTime()) / 60000);
  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  const date = new Date(sentAt);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default function NotificationInboxScreen() {
  const router = useRouter();
  const { data: notifications = [], isLoading, isError, refetch } = useNotificationInbox();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const hasUnread = notifications.some((item) => !item.read);

  const handlePress = (item: InboxNotification) => {
    if (!item.read) markRead.mutate(item.id);
    // 푸시를 탭했을 때와 같은 규칙으로 이동한다(리마인더→예정 운동, 요약→리포트).
    // 미실행 알림은 이동할 곳이 마땅치 않아 읽음 처리만 한다(푸시 탭은 기존대로 홈).
    if (item.type === "INACTIVITY_ALERT") return;
    const route = getPushTapRoute({ type: item.type, referenceId: item.referenceId ?? "" });
    if (route) openPushTapRoute(router, route);
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <PressableScale style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={20} color={colors.text} />
          </PressableScale>
          <Text style={styles.headerTitle}>알림</Text>
          <PressableScale
            style={styles.readAllButton}
            onPress={() => markAllRead.mutate()}
            disabled={!hasUnread}
            hitSlop={8}
          >
            <Text style={[styles.readAllText, !hasUnread && styles.readAllTextDisabled]}>모두 읽음</Text>
          </PressableScale>
        </View>

        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {isError ? (
            <PressableScale style={styles.emptyWrap} onPress={() => refetch()}>
              <AppText style={styles.emptyText}>알림을 불러오지 못했어요. 눌러서 다시 시도해주세요.</AppText>
            </PressableScale>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyWrap}>
              <BellOff size={28} color={colors.text3} />
              <Text style={styles.emptyText}>{isLoading ? "불러오는 중..." : "받은 알림이 없어요."}</Text>
            </View>
          ) : (
            notifications.map((item) => (
              <PressableScale key={item.id} style={styles.card} onPress={() => handlePress(item)}>
                <View style={styles.cardTop}>
                  <View style={styles.titleRow}>
                    {!item.read && <View style={styles.unreadDot} />}
                    <Text style={[styles.cardTitle, item.read && styles.cardTitleRead]}>{item.title}</Text>
                  </View>
                  <Text style={styles.cardTime}>{formatRelativeTime(item.sentAt)}</Text>
                </View>
                <Text style={styles.cardBody}>{item.body}</Text>
              </PressableScale>
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
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: "700" },
  // 뒤로가기 버튼과 같은 폭을 줘서 제목이 가운데에 오도록 한다.
  readAllButton: { minWidth: 36, alignItems: "flex-end" },
  readAllText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  readAllTextDisabled: { color: colors.track },
  listContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  titleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  cardTitle: { flexShrink: 1, color: colors.text, fontSize: 15, fontWeight: "700" },
  cardTitleRead: { color: colors.text2, fontWeight: "600" },
  cardTime: { color: colors.text3, fontSize: 12 },
  cardBody: { color: colors.text2, fontSize: 13, lineHeight: 19 },
  emptyWrap: { alignItems: "center", gap: 12, paddingVertical: 80 },
  emptyText: { color: colors.text3, fontSize: 14, textAlign: "center" },
});
