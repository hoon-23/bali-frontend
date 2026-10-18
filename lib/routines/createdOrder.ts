import AsyncStorage from "@react-native-async-storage/async-storage";

// 새로 만든 루틴을 목록 맨 위에 두기 위한 기록. 서버 응답에는 생성 시각이 없고 새 루틴은 실행 이력도 없어서
// (정렬 기준이 lastUsedAt) 그냥 두면 맨 아래로 간다. 이 기기에서 만든 루틴의 id와 만든 시각을 저장해 두고,
// 실행해서 lastUsedAt이 생기면 원래 규칙(최근 실행순)으로 돌아간다. 다른 기기에서 만든 루틴에는 적용되지 않는다.
const KEY = "routineCreatedAt";
const MAX_ENTRIES = 50;

export type CreatedAtMap = Record<string, number>;

export async function loadCreatedAt(): Promise<CreatedAtMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CreatedAtMap) : {};
  } catch {
    return {};
  }
}

export async function rememberCreated(id: string): Promise<void> {
  try {
    const map = await loadCreatedAt();
    map[id] = Date.now();
    // 오래된 항목부터 버려 저장소가 커지지 않게 한다.
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // 무시 — 정렬 보조 정보일 뿐이다
  }
}
