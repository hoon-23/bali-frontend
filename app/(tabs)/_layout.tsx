import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter, useSegments } from "expo-router";
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_BOTTOM_MARGIN, TAB_BAR_HEIGHT } from "../../constants/layout";
import { useInProgressSessionId } from "../../hooks/api/useInProgressSession";
import { recordsTabBarCollapse } from "../../lib/recordsScroll";

const TAB_BAR_SIDE_MARGIN_RATIO = 0.05;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
// 축소됐을 때의 배율 — 완전히 사라지지 않고 살짝 작아지는 정도로만.
const COLLAPSED_SCALE = 0.86;

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
  const segments = useSegments();
  // 로컬 스토어(workoutSessionStore) 대신 서버 상태로 판단 — 앱을 완전 종료했다 다시
  // 열어도(로컬 상태는 초기화되지만) 실제로 진행 중인 세션이 있으면 배너가 유지된다.
  const inProgressSessionId = useInProgressSessionId();
  const tabBarBottom = insets.bottom + TAB_BAR_BOTTOM_MARGIN;
  const tabBarSideMargin = width * TAB_BAR_SIDE_MARGIN_RATIO;

  // 스레드/인스타처럼 스크롤에 따라 탭바+배너를 줄이는 건 무한스크롤이 있는
  // 기록 탭에서만 의미가 있어서 그 탭에 있을 때만 적용한다. recordsTabBarCollapse 자체는
  // (tabs)/_layout.tsx가 탭 전환 중에도 계속 마운트돼 있어 값이 유지된다.
  const isRecordsTab = segments[segments.length - 1] === "templates";
  const collapseScale = recordsTabBarCollapse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, COLLAPSED_SCALE],
  });
  const hideTransform = isRecordsTab ? { transform: [{ scale: collapseScale }] } : undefined;

  return (
    <View style={styles.container}>
      <Tabs
        tabBar={(props) => (
          <CustomTabBar
            {...props}
            bottom={tabBarBottom}
            sideMargin={tabBarSideMargin}
            hideTransform={hideTransform}
          />
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="home" options={{ title: "홈" }} />
        <Tabs.Screen name="templates" options={{ title: "기록" }} />
        <Tabs.Screen name="stats" options={{ title: "리포트" }} />
        <Tabs.Screen name="profile" options={{ title: "프로필" }} />
      </Tabs>

      {inProgressSessionId && (
        <AnimatedPressable
          style={[
            styles.banner,
            {
              bottom: tabBarBottom + TAB_BAR_HEIGHT + 12,
              left: tabBarSideMargin,
              right: tabBarSideMargin,
            },
            hideTransform,
          ]}
          onPress={() => router.push(`/workout/${inProgressSessionId}`)}
        >
          <Ionicons name="barbell" size={20} color="#2DD4BF" />
          <Text style={styles.bannerText}>운동 진행 중</Text>
          <Ionicons name="chevron-forward" size={18} color="#6B6B6B" />
        </AnimatedPressable>
      )}
    </View>
  );
}

type CustomTabBarProps = BottomTabBarProps & {
  bottom: number;
  sideMargin: number;
  hideTransform?: { transform: { scale: Animated.AnimatedInterpolation<number> }[] };
};

function CustomTabBar({ state, descriptors, navigation, bottom, sideMargin, hideTransform }: CustomTabBarProps) {
  return (
    <Animated.View style={[styles.tabBar, { bottom, left: sideMargin, right: sideMargin }, hideTransform]}>
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
    </Animated.View>
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
