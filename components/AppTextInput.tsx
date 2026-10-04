import { Check } from "lucide-react-native";
import { useId } from "react";
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

// 앱 전역 공용 TextInput. 키보드 종류에 따라 "완료" 처리를 자동으로 붙인다.
// - 숫자 패드(numeric/number-pad/decimal-pad 등)와 여러 줄 입력: iOS에는 리턴 키가 없거나
//   줄바꿈 용도라서, 키보드 위에 체크 아이콘 "완료" 바(InputAccessoryView)를 붙인다.
// - 그 외 한 줄 텍스트 입력: returnKeyType="done" + 리턴 시 키보드 닫기로 충분하다.
// 화면마다 따로 구현하지 않도록 TextInput 대신 이걸 쓴다(props는 TextInput과 동일).
const NUMERIC_KEYBOARD_TYPES = new Set(["numeric", "number-pad", "decimal-pad", "phone-pad"]);

export function AppTextInput(props: TextInputProps) {
  const accessoryId = useId();
  const needsAccessory =
    NUMERIC_KEYBOARD_TYPES.has(props.keyboardType ?? "") || props.multiline === true;

  return (
    <>
      <TextInput
        returnKeyType="done"
        // 한 줄 입력은 리턴 키로 닫는다(multiline은 리턴이 줄바꿈이라 제외).
        blurOnSubmit={!props.multiline}
        inputAccessoryViewID={needsAccessory && Platform.OS === "ios" ? accessoryId : undefined}
        {...props}
      />
      {needsAccessory && Platform.OS === "ios" && (
        <InputAccessoryView nativeID={accessoryId}>
          <View style={styles.bar}>
            <Pressable onPress={Keyboard.dismiss} hitSlop={8} style={styles.button}>
              <Check size={18} color="#2DD4BF" />
              <Text style={styles.text}>완료</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: "#1A1A22",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  text: {
    color: "#2DD4BF",
    fontSize: 16,
    fontWeight: "600",
  },
});
