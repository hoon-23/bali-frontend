import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

type SocialProvider = {
  id: "kakao" | "naver" | "apple" | "google";
  label: string;
  backgroundColor: string;
  textColor: string;
};

const SOCIAL_PROVIDERS: SocialProvider[] = [
  { id: "kakao", label: "KakaoTalk으로 계속하기", backgroundColor: "#FEE500", textColor: "#191919" },
  { id: "naver", label: "Naver로 계속하기", backgroundColor: "#03C75A", textColor: "#FFFFFF" },
  { id: "apple", label: "Apple로 계속하기", backgroundColor: "#FFFFFF", textColor: "#000000" },
  { id: "google", label: "Google로 계속하기", backgroundColor: "#4285F4", textColor: "#FFFFFF" },
];

const LAST_LOGIN_PROVIDER_KEY = "swayt:last-login-provider";

export default function LoginScreen() {
  const router = useRouter();
  const [lastProviderId, setLastProviderId] = useState<SocialProvider["id"] | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(LAST_LOGIN_PROVIDER_KEY).then((storedId) => {
      if (storedId && SOCIAL_PROVIDERS.some((provider) => provider.id === storedId)) {
        setLastProviderId(storedId as SocialProvider["id"]);
      }
    });
  }, []);

  const handleSocialLogin = (providerId: SocialProvider["id"]) => {
    AsyncStorage.setItem(LAST_LOGIN_PROVIDER_KEY, providerId);
    router.push("/home");
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1F5F5B", "#0B0B0F"]}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <View style={styles.content}>
        <View style={styles.titleBlock}>
          <Text style={styles.wordmark}>Swayt</Text>
          <Text style={styles.tagline}>강력한 근력 운동 추적</Text>
        </View>

        <View style={styles.buttonGroup}>
          {SOCIAL_PROVIDERS.map((provider) => (
            <Pressable
              key={provider.id}
              style={[styles.button, { backgroundColor: provider.backgroundColor }]}
              onPress={() => handleSocialLogin(provider.id)}
            >
              <Text style={[styles.buttonText, { color: provider.textColor }]}>
                {provider.label}
              </Text>
              {lastProviderId === provider.id && (
                <View style={styles.recentBadge}>
                  <View style={styles.recentBadgePill}>
                    <Text style={styles.recentBadgeText}>최근</Text>
                  </View>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <View style={styles.spacer} />

        <Text style={styles.footer}>
          계속 진행하면 이용약관과 개인정보처리방침에 동의한 것입니다
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 100,
  },
  titleBlock: {
    alignItems: "center",
    gap: 8,
    marginBottom: 40,
  },
  wordmark: {
    color: "#2DD4BF",
    fontSize: 36,
    fontWeight: "700",
  },
  tagline: {
    color: "#A0A0A0",
    fontSize: 14,
  },
  buttonGroup: {
    width: "100%",
    gap: 12,
  },
  spacer: {
    flex: 1,
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  recentBadge: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  recentBadgePill: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  recentBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  footer: {
    color: "#6B6B6B",
    fontSize: 12,
    textAlign: "center",
  },
});
