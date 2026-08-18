import { BlurView } from "expo-blur";
import { Tabs, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWorkoutSessionStore } from "../../store/workoutSessionStore";

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sessionId = useWorkoutSessionStore((state) => state.sessionId);

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#2DD4BF",
          tabBarInactiveTintColor: "#6B6B6B",
          tabBarStyle: styles.tabBar,
          tabBarBackground: () => (
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          ),
        }}
      >
        <Tabs.Screen name="home" options={{ title: "홈" }} />
        <Tabs.Screen name="templates" options={{ title: "템플릿" }} />
        <Tabs.Screen name="stats" options={{ title: "통계" }} />
        <Tabs.Screen name="profile" options={{ title: "프로필" }} />
      </Tabs>

      {sessionId && (
        <Pressable
          style={[styles.banner, { bottom: insets.bottom + 49 }]}
          onPress={() => router.push(`/workout/${sessionId}`)}
        >
          <Text style={styles.bannerText}>운동 진행 중 · 계속하기</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    position: "absolute",
    backgroundColor: "transparent",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    elevation: 0,
  },
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#2DD4BF",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  bannerText: {
    color: "#0B0B0F",
    fontSize: 14,
    fontWeight: "600",
  },
});
