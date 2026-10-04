// 기능 플래그. EXPO_PUBLIC_* 값은 빌드 시점에 번들에 인라인되며 비밀이 아니다.
// 기본은 꺼짐 — EAS 빌드에는 이 env가 없어 배포 빌드에서는 자동으로 숨겨진다.
// 로컬에서 켜려면 .env에 EXPO_PUBLIC_SUBSCRIPTION_UI=true 를 추가하고 Metro를 재시작한다.
// 꺼져 있어도 403 LIMIT_EXCEEDED 처리(시트/잠금 표시)는 동작하며, PRO/구독 관련 문구와 버튼만 숨긴다.
export const SUBSCRIPTION_UI_ENABLED = process.env.EXPO_PUBLIC_SUBSCRIPTION_UI === "true";
