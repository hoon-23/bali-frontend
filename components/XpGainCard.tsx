import { StyleSheet, Text, View } from "react-native";
import { useTimedProgress } from "../hooks/useTimedProgress";
import type { SessionXpResult } from "../hooks/api/useSessions";
import { breakSentences } from "../lib/format/text";

const ZERO_REASON_TEXT: Record<NonNullable<SessionXpResult["zeroReason"]>, string> = {
  DAILY_LIMIT: "하루 최대 2회까지만 경험치가 쌓여요. 오늘은 한도에 도달했어요.",
  NO_COMPLETED_LOG: "기록한 운동이 부족해서 경험치가 쌓이지 않았어요. 완료로 표시하거나 세트를 충분히 기록하면 쌓여요.",
};

// 화면 전환이 끝났다는 신호(start)를 받은 뒤 잠깐 자리 잡을 시간을 두고 시작한다.
const START_DELAY_MS = 150;
const FILL_DURATION_MS = 1100;

function ratio(currentXp: number, xpForNextLevel: number): number {
  return xpForNextLevel > 0 ? Math.min(1, currentXp / xpForNextLevel) : 0;
}

// 운동 완료 화면의 경험치 카드 — 바 전체 길이는 현재 레벨의 필요 경험치이고, 기존 경험치 위치까지는
// 처음부터 어두운 색으로 보이며 그 지점에서 이번에 얻은 만큼 밝은 색이 차오른다.
// 레벨이 오르면 바를 끝까지 채운 뒤 레벨/분모를 바꾸고(어두운 구간은 사라짐), 새 레벨의 0에서 이어서 채운다.
// 높이는 항상 고정이라 연출 중에도 아래가 밀리지 않는다.
// start가 false인 동안은 t=0(기존 경험치 위치, +0 XP)으로 멈춰 있다가 true가 되면 한 번만 재생한다.
export function XpGainCard({ xp, start = true }: { xp: SessionXpResult; start?: boolean }) {
  const { before, after } = xp;
  const leveledUp = after.level > before.level;
  const beforeRatio = ratio(before.currentXp, before.xpForNextLevel);
  const afterRatio = ratio(after.currentXp, after.xpForNextLevel);

  // 한 개의 시계(t: 0~1)로 바 너비·숫자를 모두 계산해 서로 어긋나지 않게 한다.
  const t = useTimedProgress({ duration: FILL_DURATION_MS, delay: START_DELAY_MS, enabled: start });

  // 바가 지나는 구간: 일반은 기존 → 이후 위치 하나, 레벨업은 (기존 → 끝) + (0 → 이후 위치) 두 개.
  // t를 구간 길이에 비례해 나눠, 바가 일정한 속도로 움직이게 한다.
  const firstLen = leveledUp ? 1 - beforeRatio : Math.max(0, afterRatio - beforeRatio);
  const secondLen = leveledUp ? afterRatio : 0;
  const totalLen = firstLen + secondLen;
  const travelled = t * totalLen;
  // 레벨업이면 첫 구간을 다 지난 뒤부터 새 레벨 기준으로 표시한다(획득 0이면 totalLen=0이라 움직이지 않음).
  const inSecondLeg = leveledUp && totalLen > 0 && travelled >= firstLen;
  const gainRatio = inSecondLeg ? travelled - firstLen : beforeRatio + travelled;
  // 기존 경험치 구간(어두운 색)은 처음부터 고정, 새 레벨에서는 없다.
  const baseRatio = inSecondLeg ? 0 : beforeRatio;

  const displayedLevel = inSecondLeg ? after.level : before.level;
  const displayedNeeded = inSecondLeg ? after.xpForNextLevel : before.xpForNextLevel;
  const displayedXp = Math.round(gainRatio * displayedNeeded);
  const displayedEarned = Math.round(t * xp.earnedXp);
  const showLevelUp = inSecondLeg;

  const toWidth = (value: number) => `${Math.min(1, Math.max(0, value)) * 100}%` as const;
  const earned = xp.earnedXp > 0;
  // partial 필드가 없는 구버전 서버 응답은 정상 완료(false)로 간주한다.
  const detail = earned
    ? xp.partial
      ? `일부만 수행해서 ${xp.earnedXp} XP가 쌓였어요. 모두 완료하면 더 받을 수 있어요.`
      : xp.bonusXp > 0
        ? `기본 ${xp.baseXp} + 연속 보너스 ${xp.bonusXp}`
        : null
    : xp.zeroReason
      ? ZERO_REASON_TEXT[xp.zeroReason]
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>Lv.{displayedLevel}</Text>
        </View>
        {showLevelUp && <Text style={styles.levelUpText}>레벨 업!</Text>}
        <Text style={[styles.earnedText, !earned && styles.earnedTextZero]}>+{displayedEarned} XP</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fillGain, { width: toWidth(gainRatio) }]} />
        <View style={[styles.fillBase, { width: toWidth(baseRatio) }]} />
      </View>
      <Text style={styles.xpText}>
        {displayedXp.toLocaleString()} / {displayedNeeded.toLocaleString()} XP
      </Text>
      {/* 문장 끝 마침표는 남기고 그 뒤에서 줄바꿈한다. */}
      <Text style={styles.detailText} numberOfLines={2} lineBreakStrategyIOS="hangul-word">
        {breakSentences(detail ?? " ")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    // 연출 중 내용이 바뀌어도 높이가 변하지 않도록 고정한다.
    height: 128,
    backgroundColor: "#1C1C25",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 14,
    gap: 10,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  levelBadge: {
    backgroundColor: "rgba(45, 212, 191, 0.15)",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  levelBadgeText: { color: "#2DD4BF", fontSize: 13, fontWeight: "700" },
  levelUpText: { color: "#FBBF24", fontSize: 13, fontWeight: "700" },
  earnedText: { marginLeft: "auto", color: "#2DD4BF", fontSize: 16, fontWeight: "700" },
  earnedTextZero: { color: "#6B6B6B" },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  // 이전 경험치(어두운 색) 위에 이번에 얻은 만큼(밝은 색)이 이어서 차오른다.
  fillBase: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "#1F7A70" },
  fillGain: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "#2DD4BF" },
  xpText: { color: "#E5E5E5", fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"] },
  detailText: { color: "#A0A0A0", fontSize: 12, lineHeight: 17 },
});
