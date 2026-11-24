# ADR-0004: Live Activity 상태 계산을 네이티브 엔진 한 곳에 둠

- 상태: 채택됨
- 결정일: 2026-10-18
- 소급 작성일: 2026-11-24

## 맥락

운동 중 잠금화면과 Dynamic Island에서 앱을 열지 않고 세트를 시작·완료할 수 있어야 했습니다. 이 버튼은 앱이 꺼져 있어도 동작해야 하므로, 버튼을 누를 때 JS가 아니라 위젯 확장의 네이티브 코드가 진행 중 기록(plan)을 바꿔야 합니다.

처음에는 `expo-live-activity` 라이브러리로 시작했습니다. 설치와 빌드 호환성은 통과했지만 세 가지가 맞지 않았습니다.

- 위젯 타이머가 "종료 시각까지 남은 시간" 카운트다운 전용이라, 종료 시각이 없는 세트 스톱워치(경과 시간)를 표시할 수 없었습니다.
- 위젯 화면이 라이브러리 타겟 안에 있어 `prebuild`마다 덮어써졌고, `ContentState` 모양도 라이브러리가 정했습니다.
- 버튼 동작(App Intent, App Group)도 같은 타겟을 고쳐야 했습니다.

## 결정

라이브러리 없이 로컬 Expo 모듈(`modules/swayt-live-activity`)과 위젯 타겟(`targets/widget`)을 직접 Swift로 만듭니다. 화면 상태 계산(어느 종목을 보여줄지, 버튼 동작)은 네이티브 `WorkoutPlanEngine` 한 곳이 맡습니다.

- 앱과 위젯은 다른 Xcode 타깃이라 공유 Swift 파일은 `modules/.../Shared`가 원본이고 `targets/widget`이 복사본입니다. `scripts/sync-live-activity-shared.sh`로 맞춥니다.
- 엔진은 `scripts/test-workout-engine.sh`로 맥에서 단독 검증합니다.

## 검토한 대안

- **`expo-live-activity` 0.4.2**: 위의 이유로 중단했습니다.
- **`react-native-widget-extension`**: `@expo/config-plugins ~56`에 의존하는데 당시 SDK 54는 `~54`라서 제외했습니다.

## 결과

- 얻는 것: 스톱워치 표시와 위젯 UI를 자유롭게 바꿀 수 있고, 앱이 꺼져 있어도 버튼이 동작합니다. 버튼 로직을 시뮬레이터 없이 검증할 수 있습니다.
- 감수하는 것: 같은 동작이 JS 스토어(`workoutSessionStore`)에도 있어서 한쪽을 고치면 다른 쪽도 같이 고쳐야 합니다. Swift가 바뀌면 OTA가 안 되고 새 빌드가 필요합니다. 공유 파일을 복사본과 맞추는 단계가 하나 더 있습니다.

## 관련 문서

- [프론트엔드 구조: 진행 중 운동과 Live Activity](../architecture.md)
- [ADR-0002: OTA 업데이트는 appVersion 런타임 버전 정책](./0002-ota-앱버전-런타임-정책.md)
