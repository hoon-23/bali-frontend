# Swayt 프론트엔드 구조

현재 구조를 한 장으로 요약한 문서입니다. 구조가 바뀌면 이 문서를 같이 고칩니다. 디자인 규칙은 [DESIGN.md](https://github.com/hoon-23/bali-frontend/blob/main/DESIGN.md), 실행 방법은 [README](https://github.com/hoon-23/bali-frontend/blob/main/README.md)에 있습니다.

## 한눈에 보기

```
[iOS 앱 (Expo / React Native)]
  ├─ 화면: Expo Router (파일 = 라우트)
  ├─ 서버 상태: TanStack Query ── Axios ──▶ 백엔드 REST API (bali-api, JWT)
  ├─ 클라이언트 상태: Zustand (진행 중 운동은 기기에 저장)
  └─ 네이티브 모듈: Live Activity(잠금화면·Dynamic Island) ── App Group ── 위젯 확장
```

## 폴더와 역할

| 폴더 | 역할 |
|---|---|
| `app/` | 화면. 파일 경로가 곧 라우트입니다. |
| `components/`, `components/ui/` | 공용 UI. 버튼·구역 등 디자인 부품은 `ui/`에 있습니다. |
| `hooks/api/` | TanStack Query 훅. 서버 엔드포인트 하나당 훅 하나가 기본입니다. |
| `hooks/` | 앱 생명주기와 연결되는 훅(푸시 토큰 등록, 푸시 탭 이동, Live Activity 동기화 등). |
| `store/` | Zustand 스토어(인증, 진행 중 운동, 루틴 작성 등). |
| `lib/` | API 클라이언트, 토큰 저장, 알림, 운동 기록 계산 같은 순수 로직. 단위 테스트(jest)는 `lib/**`에 둡니다. |
| `constants/` | 디자인 값(`theme.ts`), 운동 종목·근육 부위 정의. |
| `modules/swayt-live-activity/` | 로컬 Expo 네이티브 모듈(Swift). Live Activity 시작·갱신·종료. |
| `targets/widget/` | Live Activity 위젯 확장(Xcode 타깃). |

`ios/`와 `android/`는 저장소에 없고, 빌드할 때 `expo prebuild`가 설정에서 만들어 냅니다(CNG 방식).

## 화면과 네비게이션

- 하단 탭 4개: **홈 · 기록 · 리포트 · 프로필**(`app/(tabs)/`). 탭 바는 커스텀 컴포넌트입니다.
- 탭 밖 화면: 운동 진행·요약(`workout/`), 루틴 만들기·상세·예약·운동 검색(`routines/`), 기록 상세(`records/`), 예정된 운동(`upcoming/`), 계정(`account/`), 알림함·설정(`notifications/`), 개인정보처리방침(`legal/`).
- 진입 순서: 스플래시 → 로그인 상태 확인 → 로그인 화면 또는 홈. 저장된 진행 중 운동이 있으면 복원 가드가 정리 또는 이어 하기를 결정합니다.
- 푸시를 눌러 들어오면 알림 종류에 맞는 화면으로 이동합니다(`usePushTapNavigation`).

## 백엔드 연동

- 모든 요청은 `lib/api/client.ts`의 Axios 인스턴스를 거칩니다. 요청마다 액세스 토큰을 붙이고, 만료되면 리프레시 토큰으로 한 번만 갱신한 뒤 재시도합니다(동시 요청은 갱신 하나를 공유).
- 액세스 토큰은 메모리(Zustand), 리프레시 토큰은 `expo-secure-store`에 둡니다.
- 서버 주소는 `EXPO_PUBLIC_API_BASE_URL`로 정합니다. 개발 빌드에서는 Metro 호스트를 따라가고, 릴리스 빌드에서 값이 없으면 일부러 실패합니다.
- 로그인은 Google · Kakao · Naver · Apple 4종이며 각 SDK의 토큰을 서버에 보내 앱 토큰으로 교환합니다.
- 집계(주간·월간 리포트, 경험치)는 서버가 계산하고 앱은 표시만 합니다.
- 푸시 토큰은 로그인 상태로 앱에 들어올 때마다 서버에 등록합니다(서버는 토큰 기준 upsert).

## 진행 중 운동과 Live Activity

- 운동 시작부터 종료까지의 기록(세트별 시간, 무게·횟수)은 `workoutSessionStore`가 기기에 저장해, 앱이 꺼져도 이어집니다. 종료할 때 서버에 일괄 제출합니다.
- 잠금화면 Live Activity는 같은 기록(plan)을 App Group 공유 저장소에 내보내고, 위젯 버튼(세트 시작·완료)은 앱이 꺼져 있어도 네이티브 코드가 plan을 직접 바꿉니다. 앱은 다시 켜질 때 위젯이 바꾼 내용을 가져와 합칩니다.
- 화면 상태 계산(어느 종목을 보여줄지, 버튼 동작)은 네이티브 `WorkoutPlanEngine` 한 곳이 맡습니다. 같은 동작이 JS 스토어에도 있으므로 한쪽을 고치면 다른 쪽도 같이 고칩니다.
- 앱과 위젯은 서로 다른 Xcode 타깃이라 공유 Swift 파일은 `modules/.../Shared`가 원본이고 `targets/widget`은 복사본입니다. `scripts/sync-live-activity-shared.sh`로 맞춥니다. 버튼 로직은 `scripts/test-workout-engine.sh`로 맥에서 단독 검증합니다.

## 빌드와 배포

| 구분 | 방법 |
|---|---|
| 개발 | Expo Go는 쓰지 않습니다(네이티브 모듈). 개발 빌드를 시뮬레이터에 설치하고 `npm start`로 Metro를 띄웁니다. |
| 앱 빌드 | EAS Build(production 프로파일)로 iOS 빌드를 만듭니다. 빌드 번호는 자동으로 올라갑니다. |
| 스토어 업로드 | 빌드 결과물을 Transporter로 App Store Connect에 올려 TestFlight에서 확인한 뒤 심사에 제출합니다. |
| JS만 바뀐 수정 | EAS Update(OTA)로 `production` 채널에 배포합니다(`npm run update:production`). |
| 런타임 버전 | `appVersion` 정책이라 앱 버전(`app.json`의 `version`)이 같은 설치본에만 OTA가 갑니다. 네이티브가 바뀌면 버전을 올리고 새 빌드를 냅니다. JS만 바뀔 때는 버전을 올리지 않습니다. |
| CI | GitHub Actions가 `main`·`develop`의 push와 PR에서 타입 체크(`tsc`)와 단위 테스트(`jest`)를 돌립니다. 배포는 자동화하지 않았고 위 절차를 손으로 실행합니다. |

브랜치는 `develop`에서 작업하고, 빌드·배포는 `main`에 병합한 뒤 `main`에서 합니다.

## 관련 문서

- [DESIGN.md](https://github.com/hoon-23/bali-frontend/blob/main/DESIGN.md): 색·글자·버튼·움직임 규칙
- [README](https://github.com/hoon-23/bali-frontend/blob/main/README.md): 소개와 실행 방법
- [설계 결정 기록(ADR)](./adr/README.md): 기술 선택의 이유
