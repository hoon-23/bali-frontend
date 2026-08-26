export const TAB_BAR_HEIGHT = 52;
export const TAB_BAR_BOTTOM_MARGIN = 12;
export const SCREEN_HORIZONTAL_MARGIN = 20;

// "운동 진행 중" 배너((tabs)/_layout.tsx) 자체의 높이(약 44) + 탭바 위 여백(12) —
// 배너가 떠 있을 때 각 탭 화면의 스크롤 콘텐츠 하단 패딩에 더해서, 마지막 항목이
// 배너에 가려져 탭이 안 먹히는 문제를 막는다. 화면마다 이 위에 원하는 여유 간격을
// 추가로 더해서 쓴다(예: 홈 화면은 카드 사이 간격(12)과 통일).
export const IN_PROGRESS_BANNER_RESERVED_HEIGHT = 56;
