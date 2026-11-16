import { Text, TextProps } from "react-native";

import { breakSentences } from "../lib/format/text";

// 한글을 어절(단어) 단위로만 줄바꿈하는 Text 래퍼. props는 Text와 동일하다.
// React 19에서는 함수형 컴포넌트의 defaultProps가 무시되므로 전역 기본값 대신 이 래퍼를 쓴다.
// 글자(string)가 문장부호(. ? !) 뒤에 공백으로 이어지면 그 자리에서 줄을 바꾼다 —
// "찾는 운동이 없나요? 직접 추가"처럼 문장 중간에서 어색하게 끊기는 것을 막는다.
export function AppText({ lineBreakStrategyIOS = "hangul-word", children, ...rest }: TextProps) {
  return (
    <Text lineBreakStrategyIOS={lineBreakStrategyIOS} {...rest}>
      {typeof children === "string" ? breakSentences(children) : children}
    </Text>
  );
}
