import { Text, TextProps } from "react-native";

// 한글을 어절(단어) 단위로만 줄바꿈하는 Text 래퍼. props는 Text와 동일하다.
// React 19에서는 함수형 컴포넌트의 defaultProps가 무시되므로 전역 기본값 대신 이 래퍼를 쓴다.
export function AppText({ lineBreakStrategyIOS = "hangul-word", ...rest }: TextProps) {
  return <Text lineBreakStrategyIOS={lineBreakStrategyIOS} {...rest} />;
}
