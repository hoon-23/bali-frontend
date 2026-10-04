import { BellOff, ChevronLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { getPushTapRoute, openPushTapRoute } from "../../lib/notifications";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { CARD_SHADOW } from "../../constants/shadow";
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
    // 푸시를 탭했을 때와 같은 규칙으로 이동한다(리마인더→예정 운동, 요약→리포트, 미실행→홈).
    const route = getPushTapRoute({ type: item.type, referenceId: item.referenceId ?? "" });
    if (route) openPushTapRoute(router, route);
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>알림</Text>
          <Pressable
            style={styles.readAllButton}
            onPress={() => markAllRead.mutate()}
            disabled={!hasUnread}
            hitSlop={8}
          >
            <Text style={[styles.readAllText, !hasUnread && styles.readAllTextDisabled]}>모두 읽음</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {isError ? (
            <Pressable style={styles.emptyWrap} onPress={() => refetch()}>
              <AppText style={styles.emptyText}>알림을 불러오지 못했어요. 눌러서 다시 시도해주세요.</AppText>
            </Pressable>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyWrap}>
              <BellOff size={28} color="#6B6B6B" />
              <Text style={styles.emptyText}>{isLoading ? "불러오는 중..." : "받은 알림이 없어요."}</Text>
            </View>
          ) : (
            notifications.map((item) => (
              <Pressable key={item.id} style={styles.card} onPress={() => handlePress(item)}>
                <View style={styles.cardTop}>
                  <View style={styles.titleRow}>
                    {!item.read && <View style={styles.unreadDot} />}
                    <Text style={[styles.cardTitle, item.read && styles.cardTitleRead]}>{item.title}</Text>
                  </View>
                  <Text style={styles.cardTime}>{formatRelativeTime(item.sentAt)}</Text>
                </View>
                <Text style={styles.cardBody}>{item.body}</Text>
              </Pressable>
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
    backgroundColor: "#1C1C25",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  // 뒤로가기 버튼과 같은 폭을 줘서 제목이 가운데에 오도록 한다.
  readAllButton: { minWidth: 36, alignItems: "flex-end" },
  readAllText: { color: "#2DD4BF", fontSize: 13, fontWeight: "600" },
  readAllTextDisabled: { color: "#3A3A42" },
  listContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: "#1C1C25",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 16,
    gap: 6,
    ...CARD_SHADOW,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  titleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2DD4BF" },
  cardTitle: { flexShrink: 1, color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  cardTitleRead: { color: "#A0A0A0", fontWeight: "600" },
  cardTime: { color: "#6B6B6B", fontSize: 12 },
  cardBody: { color: "#A0A0A0", fontSize: 13, lineHeight: 19 },
  emptyWrap: { alignItems: "center", gap: 12, paddingVertical: 80 },
  emptyText: { color: "#6B6B6B", fontSize: 14, textAlign: "center" },
});
