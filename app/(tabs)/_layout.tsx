import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_BOTTOM_MARGIN, TAB_BAR_HEIGHT } from "../../constants/layout";
import { useWorkoutSessionStore } from "../../store/workoutSessionStore";

const TAB_BAR_SIDE_MARGIN_RATIO = 0.05;

const TAB_ICONS: Record<string, { filled: keyof typeof Ionicons.glyphMap; outline: keyof typeof Ionicons.glyphMap }> = {
  home: { filled: "home", outline: "home-outline" },
  templates: { filled: "barbell", outline: "barbell-outline" },
  stats: { filled: "stats-chart", outline: "stats-chart-outline" },
  profile: { filled: "person", outline: "person-outline" },
};

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
        tabBar={(props) => (
          <CustomTabBar {...props} bottom={tabBarBottom} sideMargin={tabBarSideMargin} />
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="home" options={{ title: "홈" }} />
        <Tabs.Screen name="templates" options={{ title: "기록" }} />
        <Tabs.Screen name="stats" options={{ title: "리포트" }} />
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
          <Ionicons name="barbell" size={20} color="#2DD4BF" />
          <Text style={styles.bannerText}>운동 진행 중</Text>
          <Ionicons name="chevron-forward" size={18} color="#6B6B6B" />
        </Pressable>
      )}
    </View>
  );
}

type CustomTabBarProps = BottomTabBarProps & {
  bottom: number;
  sideMargin: number;
};

function CustomTabBar({ state, descriptors, navigation, bottom, sideMargin }: CustomTabBarProps) {
  return (
    <View style={[styles.tabBar, { bottom, left: sideMargin, right: sideMargin }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const icons = TAB_ICONS[route.name];
        const color = isFocused ? "#2DD4BF" : "#6B6B6B";

        const handlePress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable key={route.key} onPress={handlePress} style={styles.tabItem}>
            <Ionicons name={isFocused ? icons.filled : icons.outline} size={24} color={color} />
            <Text style={[styles.tabBarLabel, { color }]}>{String(options.title)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    position: "absolute",
    flexDirection: "row",
    height: TAB_BAR_HEIGHT,
    borderRadius: 24,
    backgroundColor: "#16161C",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingTop: 8,
    paddingBottom: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  banner: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#16161C",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  bannerText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
