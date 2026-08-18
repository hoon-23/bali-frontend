import { StyleSheet, Text, View } from "react-native";

export default function TemplatesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>템플릿 화면 (준비 중)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0B0F",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 18,
  },
});
