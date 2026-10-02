import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import type { SessionXpResult } from "../hooks/api/useSessions";

const ZERO_REASON_TEXT: Record<NonNullable<SessionXpResult["zeroReason"]>, string> = {
  DAILY_LIMIT: "하루 최대 2회까지만 경험치가 쌓여요. 오늘은 한도에 도달했어요.",
  NO_COMPLETED_LOG: "세트·횟수를 기록한 운동이 없어서 경험치가 쌓이지 않았어요.",
};

const FILL_DURATION_MS = 900;

function ratio(currentXp: number, xpForNextLevel: number): number {
  return xpForNextLevel > 0 ? Math.min(1, currentXp / xpForNextLevel) : 0;
}

// 운동 완료 화면의 경험치 카드 — 이전 경험치는 어두운 색으로 고정하고, 이번에 얻은 만큼만 밝은 색으로
// 차오른다(수치도 함께 올라간다). 레벨이 오르면 바를 끝까지 채운 뒤 새 레벨의 0에서 남은 만큼 다시 채운다.
// 높이는 항상 고정이라 연출 중에도 아래가 밀리지 않는다.
export function XpGainCard({ xp }: { xp: SessionXpResult }) {
  const { before, after } = xp;
  const leveledUp = after.level > before.level;
  // base: 이전 경험치까지(어두운 색), end: 이번 연출에서 채워진 끝(밝은 색). 둘 다 0~1 비율.
  const base = useRef(new Animated.Value(ratio(before.currentXp, before.xpForNextLevel))).current;
  const end = useRef(new Animated.Value(ratio(before.currentXp, before.xpForNextLevel))).current;
  const [displayedLevel, setDisplayedLevel] = useState(before.level);
  const [displayedNeeded, setDisplayedNeeded] = useState(before.xpForNextLevel);
  const [displayedXp, setDisplayedXp] = useState(before.currentXp);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const neededRef = useRef(before.xpForNextLevel);

  useEffect(() => {
    // 바가 차오르는 값과 숫자를 같은 값에서 파생시켜 둘이 어긋나지 않게 한다.
    const id = end.addListener(({ value }) => setDisplayedXp(Math.round(value * neededRef.current)));
    const fill = (to: number) =>
      Animated.timing(end, {
        toValue: to,
        duration: FILL_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
    const afterRatio = ratio(after.currentXp, after.xpForNextLevel);

    if (!leveledUp) {
      fill(afterRatio).start();
    } else {
      // 레벨업: 이전 레벨의 바를 끝까지 채우고 → 레벨/분모를 바꾼 뒤 → 0에서 새 값까지 다시 채운다.
      fill(1).start(({ finished }) => {
        if (!finished) return;
        neededRef.current = after.xpForNextLevel;
        setDisplayedLevel(after.level);
        setDisplayedNeeded(after.xpForNextLevel);
        setShowLevelUp(true);
        base.setValue(0);
        end.setValue(0);
        fill(afterRatio).start();
      });
    }
    return () => {
      end.removeListener(id);
      end.stopAnimation();
    };
    // 완료 화면이 뜰 때 한 번만 재생한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toWidth = (value: Animated.Value) => value.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const earned = xp.earnedXp > 0;
  const detail = earned
    ? xp.bonusXp > 0
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
        <Text style={[styles.earnedText, !earned && styles.earnedTextZero]}>+{xp.earnedXp} XP</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fillGain, { width: toWidth(end) }]} />
        <Animated.View style={[styles.fillBase, { width: toWidth(base) }]} />
      </View>
      <Text style={styles.xpText}>
        {displayedXp.toLocaleString()} / {displayedNeeded.toLocaleString()} XP
      </Text>
      <Text style={styles.detailText} numberOfLines={2}>
        {detail ?? " "}
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
