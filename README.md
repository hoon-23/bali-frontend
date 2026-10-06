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
npx expo run:ios  # 시뮬레이터 개발 빌드 설치 및 실행
npm start         # Metro 개발 서버 실행
```

소셜 로그인(Google/Kakao/Naver/Apple) 등 네이티브 모듈을 사용하므로 Expo Go 로는 실행되지 않으며, 로컬에서는 iOS 시뮬레이터 개발 빌드와 Metro 로 확인합니다. 실기기는 EAS production 빌드를 TestFlight 로 배포해 확인합니다.

## 배포

배포는 변경 범위에 따라 두 가지로 나뉩니다. 업데이트 확인은 `ON_LOAD`(앱 시작 시 확인·다운로드, 다음 실행부터 적용)이며 `fallbackToCacheTimeout` 은 0 이라 시작 화면을 기다리게 하지 않습니다.

**JS/에셋만 바뀐 경우 — EAS Update(OTA)**

```bash
npm run update:production -- --message "변경 내용 요약"
```

내부적으로 `eas update --channel production --environment production` 을 실행합니다. EAS Update 는 `eas.json` 빌드 프로필의 `env` 를 읽지 않고 로컬 `.env` 를 번들에 넣기 때문에, 스크립트가 `EXPO_PUBLIC_API_BASE_URL` 을 production 주소로 덮어씁니다. `eas update` 를 직접 실행할 때도 이 값을 꼭 함께 지정하세요(비어 있으면 실기기에서 API 주소를 찾지 못합니다). 로컬 `.env` 의 다른 `EXPO_PUBLIC_*` 값(기능 플래그 등)도 그대로 번들에 들어가니 배포 전에 확인합니다.

**네이티브 변경이 있는 경우 — 새 EAS 빌드**

네이티브 의존성 추가·변경, 권한, `app.json` 의 네이티브 설정(플러그인, infoPlist 등), Expo SDK 업그레이드가 해당합니다. `app.json` 의 `expo.version` 을 semver 로 올린 뒤 `eas build --platform ios --profile production` 으로 빌드하고, 업로드는 자동 submit 대신 Transporter 로 합니다.

**runtimeVersion 과 업데이트 스트림**

`runtimeVersion` 정책이 `appVersion` 이라 `expo.version` 이 곧 런타임 버전입니다. 버전을 올린 빌드(예: 1.4.1)와 이전 빌드(1.4.0) 사용자는 서로 다른 업데이트를 받고, OTA 는 배포 시점의 `expo.version` 과 같은 버전의 빌드에만 적용됩니다. 그래서 네이티브를 바꿨다면 반드시 버전을 올려야 하고, 반대로 JS 만 바꾼 OTA 배포에서는 버전을 올리면 안 됩니다(기존 빌드가 업데이트를 받지 못합니다).

**롤백**

```bash
npx eas-cli update:rollback                       # 대화형: 이전 업데이트 재배포 또는 빌드 내장 번들로 되돌리기
npx eas-cli update:republish --group <updateGroupId> --message "롤백 사유"   # 특정 업데이트 그룹을 다시 배포
```

롤백 이후 새 업데이트를 배포하면 모든 사용자가 그 업데이트를 받습니다.

## 참고

이 프로젝트는 별도의 백엔드(bali-api)와 통신하는 것을 전제로 설계되었습니다.
