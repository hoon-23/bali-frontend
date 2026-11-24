# Swayt

운동 루틴을 만들고 세트 단위로 기록하며 주간/월간 리포트로 돌아볼 수 있는 React Native(Expo) 피트니스 앱입니다. 별도 백엔드(bali-api)와 실제로 연동해 동작합니다.

## 주요 기능

- **소셜 로그인** — Google / Kakao / Naver / Apple 4종 지원
- **루틴 관리** — 운동 종목을 조합해 루틴을 만들고, 날짜를 지정해 운동을 예약
- **운동 세션 기록** — 세트별 스톱워치로 시간을 측정하고 세션 완료 시 일괄 제출
- **잠금화면 Live Activity** — 잠금화면과 Dynamic Island에서 앱을 열지 않고 세트를 시작·완료 (iOS 17+)
- **기록** — 완료한 세션과 세트 상세 조회, 지난 기록 삭제
- **리포트** — 주간/월간 운동 통계 (서버 집계 API 사용)
- **경험치/레벨, 푸시 알림** — 운동 완료 시 경험치 반영, 알림함과 앱 아이콘 뱃지 연동
- **스켈레톤 로딩** — 화면별 로딩 UI로 데이터 로딩 중 레이아웃 변동 최소화

하단 탭은 홈 / 기록 / 리포트 / 프로필로 구성됩니다.

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 프레임워크 | Expo SDK 54, React Native 0.81, React 19, TypeScript |
| 라우팅 | Expo Router (파일 기반) |
| 서버 상태 | TanStack Query, Axios |
| 클라이언트 상태 | Zustand |
| 애니메이션/UI | Reanimated, Gesture Handler, SVG |
| 네이티브 | Swift 로컬 Expo 모듈(Live Activity), 위젯 확장 |
| 인증/보안 | 소셜 로그인 SDK 4종, expo-secure-store |
| 테스트/CI | jest 단위 테스트, GitHub Actions(타입 체크 + 테스트) |
| 배포 | EAS Build, Transporter 업로드, EAS Update(OTA) |

## 폴더 구조

```
app/          # 화면 (Expo Router, 파일 = 라우트)
  (tabs)/     # 홈, 기록, 리포트, 프로필
  workout/    # 운동 세션 진행/요약
  routines/   # 루틴 생성/상세/예약/운동 검색
  records/    # 기록 상세
  upcoming/   # 예정된 운동
  account/, notifications/, exercises/, legal/
components/   # 공용 UI 컴포넌트 (ui/ 는 버튼 등 디자인 부품)
hooks/api/    # TanStack Query 기반 API 훅
store/        # Zustand 스토어
lib/          # API 클라이언트, 인증 토큰, 알림, 운동 기록 계산 등 (단위 테스트 포함)
constants/    # 디자인 값(theme.ts), 종목·근육 부위 정의
modules/      # 로컬 네이티브 모듈 (swayt-live-activity)
targets/      # 위젯 확장 (Live Activity UI)
```

서버 통신은 `lib`의 API 클라이언트와 `hooks/api`의 TanStack Query 훅으로 분리했습니다. 구조와 배포 흐름은 [아키텍처 문서](docs/architecture.md)에 정리했습니다.

## 실행 방법

소셜 로그인 등 네이티브 모듈을 사용하므로 Expo Go는 지원하지 않고, 개발 빌드로 실행합니다.

```bash
npm install
cp .env.example .env     # Naver 로그인 키 등 필요한 값을 채웁니다 (.env는 커밋하지 않음)
npx expo run:ios         # iOS 시뮬레이터 개발 빌드 설치 및 실행
npm start                # Metro 개발 서버
```

로컬에서는 bali-api 서버가 실행 중이어야 로그인과 데이터 조회가 동작합니다.

## 문서

- [docs/architecture.md](docs/architecture.md) — 현재 구조 요약(앱 구조, 화면, 백엔드 연동, 빌드·배포)
- [DESIGN.md](DESIGN.md) — 디자인 규칙(색, 글자, 버튼, 움직임)
- [docs/adr](docs/adr/README.md) — 설계 결정 기록(왜 그렇게 정했는지)
- 문서 사이트: https://hoon-23.github.io/bali-frontend/ (위 문서를 웹으로 게시)

## 관련 저장소

- 백엔드: bali-api (bali-backend)
