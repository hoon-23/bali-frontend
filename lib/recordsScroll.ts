import { Animated } from "react-native";

// 기록 탭(templates.tsx)에서만 쓰는 공유값 — 0(펼침) ~ 1(축소)로, 스크롤 방향이 바뀔 때마다
// templates.tsx가 Animated.timing으로 목표값을 토글하고, (tabs)/_layout.tsx가 이 값을 읽어서
// 탭바+배너를 스레드/인스타처럼 작게 줄이거나 다시 원래 크기로 되돌린다. 화면(하위 트리)은
// 탭 전환마다 다시 마운트되지만 레이아웃은 유지되므로, 두 쪽이 같은 값을 참조할 수 있게
// 모듈 스코프 싱글턴으로 둔다.
export const recordsTabBarCollapse = new Animated.Value(0);
