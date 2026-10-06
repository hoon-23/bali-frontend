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
