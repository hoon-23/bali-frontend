import { Platform } from "react-native";

// 다크 테마에서 카드를 띄워 보이게 하는 부드러운 오프셋 그림자 — 거의 검은색인
// 그라데이션 배경과 카드 경계가 밋밋해 보이지 않게 함. iOS는 shadow* 속성을 쓰고,
// Android는 elevation으로 대체됨(RN이 Android에서는 자동으로 검은 그림자를 적용함).
export const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.65,
    shadowRadius: 22,
  },
  android: {
    elevation: 12,
  },
  default: {},
});
