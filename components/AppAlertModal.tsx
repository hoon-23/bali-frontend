import { Fragment } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CARD_SHADOW } from "../constants/shadow";
import { useAlertStore } from "../store/alertStore";

// 앱 전역에서 쓰는 테마 알림창. app/_layout.tsx에 한 번만 마운트하고,
// 화면들에서는 lib/alert.ts의 appAlert()로 띄운다.
//
// RN의 <Modal>은 별도 네이티브 UIWindow에 그려지는데, presentation: "modal"로
// 띄운 화면(react-native-screens 네이티브 모달) 위에서는 그 창보다 아래에 깔리거나
// 터치가 안 먹는 경우가 있다 — 그래서 별도 Modal 대신 같은 뷰 트리 최상단에
// absolute overlay로 그린다(_layout.tsx에서 Stack보다 뒤에 렌더되어 항상 위에 옴).
export function AppAlertModal() {
  const current = useAlertStore((state) => state.current);
  const hide = useAlertStore((state) => state.hide);

  if (!current) return null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Pressable style={styles.overlay} onPress={hide}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.content}>
            <Text style={styles.title}>{current.title}</Text>
            {current.message && <Text style={styles.message}>{current.message}</Text>}
          </View>
          <View style={styles.buttonRow}>
            {current.buttons.map((button, index) => (
              <Fragment key={button.text}>
                {index > 0 && <View style={styles.buttonDivider} />}
                <Pressable
                  style={styles.button}
                  onPress={() => {
                    hide();
                    button.onPress?.();
                  }}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      button.style === "destructive" && styles.buttonTextDanger,
                    ]}
                  >
                    {button.text}
                  </Text>
                </Pressable>
              </Fragment>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#1C1C25",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    paddingTop: 20,
    paddingHorizontal: 20,
    overflow: "hidden",
    ...CARD_SHADOW,
  },
  content: {
    paddingBottom: 20,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    color: "#A0A0A0",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.14)",
    marginHorizontal: -20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  buttonText: {
    color: "#EAEAEA",
    fontSize: 15,
    fontWeight: "600",
  },
  buttonTextDanger: {
    color: "#F87171",
  },
});
