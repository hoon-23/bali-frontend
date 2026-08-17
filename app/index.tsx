import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function IndexScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>로그인 화면 자리 (Task 3에서 교체 예정)</Text>
      <Link href="/home" style={styles.link}>
        홈으로 이동 (임시)
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0B0F",
    gap: 16,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  link: {
    color: "#2DD4BF",
    fontSize: 16,
    textDecorationLine: "underline",
  },
});
