// 안내 문구의 문장 단위 줄바꿈: 마침표/물음표/느낌표 뒤에 공백이 오면 그 공백을 줄바꿈으로 바꾼다.
// 문장부호는 남기고, "1.5kg"처럼 뒤에 공백이 없는 경우와 이미 있는 줄바꿈은 건드리지 않는다.
export function breakSentences(text: string): string {
  return text.replace(/([.?!]) +/g, "$1\n");
}
