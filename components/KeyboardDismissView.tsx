import { ReactNode } from "react";
import { Keyboard, Pressable, StyleProp, ViewStyle } from "react-native";

// 스크롤 컨테이너(ScrollView/FlatList)에 공통으로 붙이는 키보드 처리 props.
// - on-drag: 스크롤하면 키보드가 내려간다.
// - handled: 키보드가 열린 상태에서도 버튼/카드 탭이 첫 탭에 정상 동작하고,
//   자식이 처리하지 않은 탭(빈 영역, 글자 등)은 키보드를 닫는다.
export const keyboardScrollProps = {
  keyboardDismissMode: "on-drag" as const,
  keyboardShouldPersistTaps: "handled" as const,
};

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// 화면 루트(헤더·여백 등 스크롤 밖 영역 포함)에서 입력창 바깥을 탭하면 키보드를 닫는 래퍼.
// 버튼/입력창 같은 자식 Pressable은 자기 터치를 먼저 가져가므로 동작이 깨지지 않는다.
export function KeyboardDismissView({ children, style }: Props) {
  return (
    <Pressable accessible={false} style={[{ flex: 1 }, style]} onPress={Keyboard.dismiss}>
      {children}
    </Pressable>
  );
}

// 칩/세그먼트/스텝퍼처럼 "선택·필터·토글" 성격의 버튼 onPress를 감싸는 유틸.
// keyboardShouldPersistTaps="handled" 상태에선 버튼이 탭을 직접 처리해서 키보드가 안 닫히므로,
// 동작을 실행하면서 키보드도 함께 닫는다. 입력창 바로 옆에서 연속 입력을 돕는 버튼엔 쓰지 않는다.
export function dismissThen(action: () => void): () => void {
  return () => {
    Keyboard.dismiss();
    action();
  };
}
