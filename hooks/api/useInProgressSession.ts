import { deriveUpcomingCardState } from "../../lib/session/sessionDisplay";
import { getTodayISODate, useUpcomingSessions } from "./useUpcomingSessions";

// 오늘 진행 중인 세션이 있으면 그 id를, 없으면 null을 반환한다.
// 탭 화면 전체에 떠 있는 "운동 진행 중" 배너((tabs)/_layout.tsx)와
// 각 탭 화면의 스크롤 하단 여백 계산이 이 값을 공유해서 쓴다.
export function useInProgressSessionId(): string | null {
  const { data: sessions } = useUpcomingSessions();
  if (!sessions) return null;
  const cardState = deriveUpcomingCardState(sessions, getTodayISODate());
  if (cardState.kind !== "TODAY") return null;
  return cardState.sessions.find((s) => s.status === "IN_PROGRESS")?.id ?? null;
}
