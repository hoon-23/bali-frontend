import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWorkoutSessionStore } from "../../store/workoutSessionStore";

const TAB_BAR_SIDE_MARGIN_RATIO = 0.05;

const TAB_ICONS: Record<string, { filled: keyof typeof Ionicons.glyphMap; outline: keyof typeof Ionicons.glyphMap }> = {
  home: { filled: "home", outline: "home-outline" },
  templates: { filled: "barbell", outline: "barbell-outline" },
  stats: { filled: "stats-chart", outline: "stats-chart-outline" },
  profile: { filled: "person", outline: "person-outline" },
};

const TAB_BAR_HEIGHT = 52;
const TAB_BAR_BOTTOM_MARGIN = 12;

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const sessionId = useWorkoutSessionStore((state) => state.sessionId);
  const tabBarBottom = insets.bottom + TAB_BAR_BOTTOM_MARGIN;
  const tabBarSideMargin = width * TAB_BAR_SIDE_MARGIN_RATIO;

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#2DD4BF",
          tabBarInactiveTintColor: "#6B6B6B",
          tabBarStyle: [
            styles.tabBar,
            { bottom: tabBarBottom, left: tabBarSideMargin, right: tabBarSideMargin },
          ],
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarIcon: ({ color, size, focused }) => {
            const icons = TAB_ICONS[route.name];
            return <Ionicons name={focused ? icons.filled : icons.outline} size={size} color={color} />;
          },
        })}
      >
        <Tabs.Screen name="home" options={{ title: "홈" }} />
        <Tabs.Screen name="templates" options={{ title: "기록" }} />
        <Tabs.Screen name="stats" options={{ title: "통계" }} />
        <Tabs.Screen name="profile" options={{ title: "프로필" }} />
      </Tabs>

      {sessionId && (
        <Pressable
          style={[
            styles.banner,
            {
              bottom: tabBarBottom + TAB_BAR_HEIGHT + 12,
              left: tabBarSideMargin,
              right: tabBarSideMargin,
            },
          ]}
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
    height: TAB_BAR_HEIGHT,
    borderRadius: 24,
    backgroundColor: "#16161C",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.1)",
    elevation: 0,
    paddingTop: 6,
    paddingBottom: 6,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  banner: {
    position: "absolute",
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
