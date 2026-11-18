import { Check } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { colors, radius, space, type } from "../constants/theme";
import { useSession } from "../hooks/api/useSessions";
import { toItemsPayload, useTemplate, useUpdateTemplate } from "../hooks/api/useTemplates";
import { apiClient } from "../lib/api/client";
import { appAlert } from "../lib/alert";
import { applyRoutineChanges, computeRoutineChanges, type RoutineChange } from "../lib/routines/routineSuggestion";
import type { ApiTemplate } from "../hooks/api/useTemplates";
import type { ExerciseLog } from "../store/workoutSessionStore";
import { AppText } from "./AppText";
import { PressableScale } from "./ui/PressableScale";
import { QuietButton } from "./ui/QuietButton";

// 카드가 늘어나도 화면을 다 차지하지 않게 목록 높이를 제한한다.
const LIST_MAX_HEIGHT = 168;

function valuesText(values: RoutineChange["before"]): string {
  const weight = values.weight > 0 ? `${values.weight}kg · ` : "";
  return `${weight}${values.sets}세트 · ${values.reps}회`;
}

type Props = { sessionId: string | null; logs: ExerciseLog[] };

// 운동 종료 요약 화면 아래쪽에 뜨는 "루틴에 반영할까요?" 카드.
// 이번 운동에서 실제로 한 값(무게·세트·횟수)이 시작한 루틴의 목표와 다를 때만 나타난다.
// 운동 중에는 묻지 않는다 — 끝낸 뒤 한 번만 묻고, 일회성으로 바꾼 날은 종목별로 끌 수 있다.
export function RoutineUpdateCard({ sessionId, logs }: Props) {
  const { data: session } = useSession(sessionId ?? undefined);
  const templateId = session?.templateId ?? undefined;
  const { data: template } = useTemplate(templateId);
  const updateTemplate = useUpdateTemplate();
  const [phase, setPhase] = useState<"ask" | "done" | "hidden">("ask");
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());

  const changes = useMemo(() => (template ? computeRoutineChanges(logs, template.items) : []), [logs, template]);

  if (phase === "hidden" || (phase === "ask" && changes.length === 0)) return null;

  const selectedKeys = new Set(changes.filter((change) => !unchecked.has(change.key)).map((change) => change.key));

  const toggle = (key: string) =>
    setUnchecked((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const handleApply = async () => {
    if (!templateId || selectedKeys.size === 0) return;
    try {
      // 저장 직전에 루틴을 다시 읽는다 — PUT은 종목 전체를 교체해서, 오래된 값 위에 덮으면 그사이 바뀐 내용이 사라진다.
      const fresh = (await apiClient.get<ApiTemplate>(`/api/v1/templates/${templateId}`)).data;
      const items = applyRoutineChanges(logs, fresh.items, selectedKeys);
      await updateTemplate.mutateAsync({
        id: templateId,
        payload: { category: fresh.category, name: fresh.name, items: toItemsPayload(items) },
      });
      setPhase("done");
    } catch {
      appAlert("루틴에 반영하지 못했어요. 다시 시도해주세요.");
    }
  };

  if (phase === "done") {
    return (
      <View style={styles.card}>
        <AppText style={styles.doneText}>루틴에 반영했어요. 다음 운동은 이 값으로 시작해요.</AppText>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <AppText style={styles.title}>루틴에 반영할까요?</AppText>
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {changes.map((change) => {
          const checked = !unchecked.has(change.key);
          return (
            <PressableScale
              key={change.key}
              style={styles.row}
              onPress={() => toggle(change.key)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel={`${change.name} ${valuesText(change.before)}에서 ${valuesText(change.after)}`}
            >
              {/* 선택 표시는 민트가 아니라 흰색 — 민트는 이 화면에서 경험치에만 쓴다. */}
              <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                {checked && <Check size={14} color={colors.onAccent} strokeWidth={3} />}
              </View>
              <View style={styles.rowText}>
                <AppText style={styles.name} numberOfLines={1}>
                  {change.name}
                </AppText>
                <AppText style={styles.values} numberOfLines={1}>
                  {valuesText(change.before)} → {valuesText(change.after)}
                </AppText>
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>
      <View style={styles.actions}>
        <QuietButton variant="text" title="그대로 두기" onPress={() => setPhase("hidden")} />
        <QuietButton
          title={updateTemplate.isPending ? "반영하는 중..." : "반영"}
          onPress={handleApply}
          disabled={selectedKeys.size === 0 || updateTemplate.isPending}
          style={styles.applyButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    padding: space.s16,
    gap: space.s12,
  },
  title: {
    ...type.body,
    fontWeight: "600",
    color: colors.text,
  },
  list: {
    maxHeight: LIST_MAX_HEIGHT,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.s12,
    minHeight: 44,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.track,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  rowText: {
    flex: 1,
  },
  name: {
    ...type.label,
    color: colors.text,
  },
  values: {
    ...type.meta,
    color: colors.text2,
    fontVariant: ["tabular-nums"],
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: space.s16,
  },
  applyButton: {
    minWidth: 96,
  },
  doneText: {
    ...type.body,
    color: colors.text2,
  },
});
