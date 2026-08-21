import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Children, cloneElement, ReactElement, ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import { usePrivacyPolicy } from "../../hooks/api/usePrivacyPolicy";

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = usePrivacyPolicy();

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>개인정보처리방침</Text>
          <View style={styles.headerSpacer} />
        </View>

        {isLoading && (
          <View style={styles.centerBox}>
            <ActivityIndicator color="#2DD4BF" />
          </View>
        )}

        {isError && !isLoading && (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>
              개인정보처리방침을 불러오지 못했습니다. 네트워크 상태를 확인해주세요.
            </Text>
            <Pressable style={styles.retryButton} onPress={() => refetch()} disabled={isRefetching}>
              <Text style={styles.retryButtonText}>{isRefetching ? "다시 시도 중..." : "다시 시도"}</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !isError && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Markdown style={markdownStyles} rules={markdownRules}>{data ?? ""}</Markdown>
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1C1C25",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    gap: 16,
  },
  errorText: {
    color: "#A0A0A0",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#1C1C25",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  retryButtonText: {
    color: "#2DD4BF",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingBottom: 40,
  },
});

// 원본 문서는 가독성을 위해 문장 단위로 줄바꿈되어 있는데, 라이브러리 기본 softbreak 규칙이
// 이를 hardbreak와 동일하게 강제 개행으로 렌더링해서 문단이 부자연스럽게 끊긴다. 공백으로 대체해
// 문단 안에서는 화면 너비에 맞게 자연스럽게 흐르도록 한다.
// table도 기본 flex:1 컬럼이 화면 폭에 맞춰 5~6등분되면서 셀마다 단어 중간에서 줄바꿈되므로,
// 컬럼에 고정 너비를 주고 가로 스크롤로 빼서 셀 안에서 자연스럽게 줄바꿈되게 한다.
const markdownRules = {
  softbreak: (node: { key: string }) => <Text key={node.key}> </Text>,
  table: (node: { key: string }, children: ReactNode) => (
    <ScrollView key={node.key} horizontal showsHorizontalScrollIndicator style={markdownStyles.table}>
      <View>{children}</View>
    </ScrollView>
  ),
  // 첫 컬럼(구분/이전받는 자 등)은 대개 값이 짧아서 나머지 컬럼과 같은 폭을 줄 필요가 없다.
  // 폭을 줄여서 가로 스크롤 폭 자체를 줄인다.
  tr: (node: { key: string }, children: ReactNode) => (
    <View key={node.key} style={markdownStyles.tr}>
      {Children.map(children as ReactElement<{ style?: unknown }>[], (child, index) =>
        cloneElement(child, {
          style: [child.props.style, index === 0 && markdownStyles.firstColumn],
        })
      )}
    </View>
  ),
};

const markdownStyles = StyleSheet.create({
  body: {
    color: "#D0D0D0",
    fontSize: 13,
    lineHeight: 21,
  },
  heading1: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 12,
  },
  heading2: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 8,
  },
  strong: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  link: {
    color: "#2DD4BF",
  },
  blockquote: {
    backgroundColor: "#1C1C25",
    borderLeftWidth: 3,
    borderLeftColor: "#2DD4BF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 8,
  },
  hr: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    height: StyleSheet.hairlineWidth,
  },
  table: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 8,
    marginVertical: 8,
  },
  th: {
    color: "#FFFFFF",
    fontWeight: "700",
    padding: 6,
    flex: 0,
    width: 150,
  },
  td: {
    color: "#D0D0D0",
    padding: 6,
    flex: 0,
    width: 150,
  },
  firstColumn: {
    width: 80,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
});
