import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { focusManager } from "@tanstack/react-query";

// React Query는 React Native에서 "앱이 앞으로 돌아옴"을 스스로 알지 못해서, 백그라운드에서 돌아와도
// 데이터를 다시 가져오지 않는다(웹의 창 포커스에 해당하는 신호가 없다). 앱이 활성화될 때를 알려 줘서
// 오래된 쿼리가 자동으로 다시 조회되게 한다. 로그인 후 영역((tabs) 레이아웃)에서 한 번만 호출한다.
export function useQueryFocusSync() {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
    });
    return () => subscription.remove();
  }, []);
}

// 앱이 앞으로 돌아올 때마다 컴포넌트를 다시 그리게 한다. 렌더 중에 "오늘 날짜"를 계산하는 화면은
// 하루가 지나도 다시 그려지지 않으면 어제 기준으로 남는다(어제 운동한 "오늘 완료"가 다음 날까지 보이는 문제).
export function useForegroundTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setTick((value) => value + 1);
    });
    return () => subscription.remove();
  }, []);
  return tick;
}
