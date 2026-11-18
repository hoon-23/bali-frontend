import type { TemplateItem } from "../../store/templatesStore";
import type { ExerciseLog } from "../../store/workoutSessionStore";
import { hasLogRecord } from "../session/logRecord";

type Values = { sets: number; reps: number; weight: number };

export type RoutineChange = {
  // 같은 종목이 루틴에 여러 번 있어도 구분되는 키: "종목id#몇 번째"
  key: string;
  name: string;
  before: Values;
  after: Values;
};

type Match = { key: string; log: ExerciseLog; item: TemplateItem };

// 세션 기록과 루틴 종목을 짝짓는다. 같은 종목이 여러 번 나오면 순서대로 하나씩 짝짓는다.
// PUT으로 루틴을 저장하면 종목 id가 바뀔 수 있어서 id가 아니라 종목 id와 순서로 찾는다.
function matchLogsToItems(logs: ExerciseLog[], items: TemplateItem[]): Match[] {
  const queues = new Map<string, TemplateItem[]>();
  [...items]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .forEach((item) => queues.set(item.exerciseId, [...(queues.get(item.exerciseId) ?? []), item]));
  const used = new Map<string, number>();
  const matches: Match[] = [];
  [...logs]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .forEach((log) => {
      const index = used.get(log.exerciseId) ?? 0;
      const item = queues.get(log.exerciseId)?.[index];
      if (!item) return;
      used.set(log.exerciseId, index + 1);
      matches.push({ key: `${log.exerciseId}#${index}`, log, item });
    });
  return matches;
}

// 가장 많이 나온 값(0 이하 제외). 같은 횟수면 더 큰 값을 고른다 — 지쳐서 낮춘 세트가 기준이 되지 않게 한다.
// 값이 하나도 없으면 null.
function dominant(values: number[]): number | null {
  const counts = new Map<number, number>();
  for (const value of values) if (value > 0) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best: number | null = null;
  for (const [value, count] of counts) {
    if (best === null || count > counts.get(best)! || (count === counts.get(best)! && value > best)) best = value;
  }
  return best;
}

// 이번 운동에서 실제로 한 값. 기록이 없거나 유산소면 null(루틴을 바꿀 근거가 없다).
// 세트 수는 "완료로 표시"한 종목만 반영한다 — 중간에 그만둔 종목의 적은 세트 수가 루틴을 깎지 않게 한다.
function actualValues(log: ExerciseLog, item: TemplateItem): { before: Values; after: Values } | null {
  if (log.isCardio || (item.targetDurationSeconds ?? 0) > 0 || !hasLogRecord(log, false)) return null;
  const before: Values = {
    sets: item.targetSets ?? 0,
    reps: item.targetReps ?? 0,
    weight: item.targetWeight ?? 0,
  };
  const actualSets = Number(log.actualSets) || 0;
  // 세트별 기록이 있으면 가장 많이 한 값, 없으면(옛 기록·직접 입력) 마지막 입력값을 쓴다.
  // 반복 수는 기준 무게로 한 세트들 안에서 고른다 — 무게를 낮춘 세트의 반복 수가 섞이지 않게 한다.
  const records = log.setRecords ?? [];
  const recordedWeight = dominant(records.map((record) => record.weight));
  const recordedReps =
    recordedWeight === null
      ? null
      : dominant(records.filter((record) => record.weight === recordedWeight).map((record) => record.reps));
  const actualReps = recordedReps ?? (Number(log.actualReps) || 0);
  const actualWeight = recordedWeight ?? (Number(log.actualWeight) || 0);
  const after: Values = {
    sets: log.completed && actualSets > 0 ? actualSets : before.sets,
    reps: actualReps > 0 ? actualReps : before.reps,
    // 맨몸 운동처럼 무게를 안 쓴 종목(0)은 기존 목표 무게를 그대로 둔다.
    weight: actualWeight > 0 ? actualWeight : before.weight,
  };
  return { before, after };
}

export function computeRoutineChanges(logs: ExerciseLog[], items: TemplateItem[]): RoutineChange[] {
  const changes: RoutineChange[] = [];
  for (const { key, log, item } of matchLogsToItems(logs, items)) {
    const values = actualValues(log, item);
    if (!values) continue;
    const { before, after } = values;
    if (before.sets === after.sets && before.reps === after.reps && before.weight === after.weight) continue;
    changes.push({ key, name: log.name, before, after });
  }
  return changes;
}

// 선택한 변경만 루틴 종목에 덮어쓴 새 종목 목록. 선택하지 않은 종목은 그대로다.
export function applyRoutineChanges(
  logs: ExerciseLog[],
  items: TemplateItem[],
  selectedKeys: Set<string>
): TemplateItem[] {
  const patched = new Map<TemplateItem, Values>();
  for (const { key, log, item } of matchLogsToItems(logs, items)) {
    if (!selectedKeys.has(key)) continue;
    const values = actualValues(log, item);
    if (values) patched.set(item, values.after);
  }
  return items.map((item) => {
    const after = patched.get(item);
    return after ? { ...item, targetSets: after.sets, targetReps: after.reps, targetWeight: after.weight } : item;
  });
}
