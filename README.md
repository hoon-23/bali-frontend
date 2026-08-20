# Swayt

운동 루틴 관리와 세션 기록을 위한 React Native(Expo) 기반 피트니스 앱입니다.

## 주요 기능

- **홈** — 오늘의 예정된 운동과 최근 활동 요약
- **루틴/템플릿** — 운동 종목을 조합해 나만의 루틴을 만들고 관리
- **운동 세션 기록** — 세트별 스톱워치 방식으로 진행 시간을 기록 (일시정지 없는 클라이언트 로컬 타이머 + 완료 시 일괄 제출)
- **예정된 운동** — 다가오는 운동 미리보기 및 세션 단위 수정
- **기록** — 완료한 세션 히스토리와 세트 상세 조회
- **리포트** — 주간/월간 운동 통계
- **프로필** — 계정 정보 및 설정

## 기술 스택

- [Expo](https://docs.expo.dev/) (SDK 54) + [Expo Router](https://docs.expo.dev/router/introduction/)
- React Native 0.81 / React 19 / TypeScript
- 상태 관리: [Zustand](https://github.com/pmndrs/zustand)
- 서버 상태/캐싱: [TanStack Query](https://tanstack.com/query)

## 프로젝트 구조

```
app/            # Expo Router 기반 화면 (파일 = 라우트)
  (tabs)/       # 하단 탭: 홈, 루틴, 리포트, 프로필
  workout/      # 운동 세션 진행 화면
  routines/     # 루틴 생성/조회/운동 검색
  records/      # 기록 상세
  upcoming/     # 예정된 운동 미리보기/수정
store/          # Zustand 스토어
components/     # 공용 UI 컴포넌트
constants/      # 테마, 색상 등 상수
```

## 시작하기

```bash
nvm use          # Node 22
npm install
npm start         # 또는 npm run ios / npm run android
```

iOS 시뮬레이터 또는 실기기의 [Expo Go](https://expo.dev/go) 앱으로 QR코드를 스캔해 실행할 수 있습니다.

## 참고

이 프로젝트는 별도의 백엔드(bali-api)와 통신하는 것을 전제로 설계되었습니다.
