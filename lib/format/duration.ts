import { formatThousands } from "./number";

export function minutesToDurationText(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${formatThousands(hours)}h${minutes}m`;
}

// 초 단위를 "MM:SS"로 표기한다(유산소 기록 시간 표시용).
export function formatSetSeconds0(total: number): string {
  const minutes = Math.floor(total / 60);
  return `${String(minutes).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// 초를 "32분" / "1시간 5분" 형태로 표기한다. 분 단위 내림, 1분 미만은 "1분 미만".
export function secondsToKoreanDuration(totalSeconds: number): string {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  if (minutes < 1) return "1분 미만";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}분`;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}
