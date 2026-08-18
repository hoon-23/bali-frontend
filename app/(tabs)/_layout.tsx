import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2DD4BF",
        tabBarInactiveTintColor: "#6B6B6B",
        tabBarStyle: { backgroundColor: "#0B0B0F" },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "홈" }} />
      <Tabs.Screen name="templates" options={{ title: "템플릿" }} />
      <Tabs.Screen name="stats" options={{ title: "통계" }} />
      <Tabs.Screen name="profile" options={{ title: "프로필" }} />
    </Tabs>
  );
}
