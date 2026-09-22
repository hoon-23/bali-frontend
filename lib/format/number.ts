// 천 단위 콤마 구분자 — Hermes의 Intl/toLocaleString 지원 여부에 기대지 않고
// 정규식으로 직접 넣는다(이 앱에서 다루는 값은 전부 0 이상의 정수/반올림 대상).
export function formatThousands(value: number): string {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
