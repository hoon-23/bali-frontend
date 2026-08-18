import { StyleSheet, Text, View } from "react-native";
import { ScreenBackground } from "../../components/ScreenBackground";

export default function StatsScreen() {
  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={styles.text}>통계 화면 (준비 중)</Text>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 18,
  },
});
