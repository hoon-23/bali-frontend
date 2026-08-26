import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";
import { ApiSession } from "../../lib/session/sessionDisplay";

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayISODate(): string {
  return toISODate(new Date());
}

export function useUpcomingSessions() {
  const today = new Date();
  const future = new Date(today);
  future.setDate(future.getDate() + 30);
  const from = toISODate(today);
  const to = toISODate(future);

  return useQuery({
    queryKey: ["upcomingSessions", from, to],
    queryFn: async () => {
      // GET /api/v1/sessions는 이제 항상 { content, hasNext, nextCursor } 형태로 응답한다
      // (지난 기록 무한스크롤을 위한 커서 페이징 도입 시 배열 → 객체로 바뀐 breaking change).
      // 예정된 운동은 30일 내 소수라 size 하나로 충분히 다 받아온다고 가정.
      const { data } = await apiClient.get<{ content: ApiSession[]; hasNext: boolean; nextCursor: string | null }>(
        "/api/v1/sessions",
        { params: { from, to, size: 100 } }
      );
      return data.content;
    },
  });
}
