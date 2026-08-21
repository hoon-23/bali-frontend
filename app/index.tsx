import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { apiClient } from "../lib/api/client";
import { useAuthStore } from "../store/authStore";
import { setRefreshToken } from "../lib/auth/tokenStorage";

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
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LAST_LOGIN_PROVIDER_KEY).then((storedId) => {
      if (storedId && SOCIAL_PROVIDERS.some((provider) => provider.id === storedId)) {
        setLastProviderId(storedId as SocialProvider["id"]);
      }
    });
  }, []);

  const finishLogin = async (provider: "google" | "apple", token: string) => {
    const { data } = await apiClient.post("/api/v1/auth/login", { provider, token });
    setAccessToken(data.accessToken);
    await setRefreshToken(data.refreshToken);
    await AsyncStorage.setItem(LAST_LOGIN_PROVIDER_KEY, provider);
    router.replace("/home");
  };

  const handleGoogleLogin = async () => {
    setLoggingIn(true);
    try {
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error("Google 로그인에서 idToken을 받지 못했습니다.");
      await finishLogin("google", idToken);
    } catch (error: any) {
      if (error?.code !== statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert("로그인 실패", "Google 로그인 중 문제가 발생했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoggingIn(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error("Apple 로그인에서 identityToken을 받지 못했습니다.");
      await finishLogin("apple", credential.identityToken);
    } catch (error: any) {
      if (error?.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("로그인 실패", "Apple 로그인 중 문제가 발생했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSocialLogin = (providerId: SocialProvider["id"]) => {
    if (providerId === "google") {
      handleGoogleLogin();
      return;
    }
    if (providerId === "apple") {
      handleAppleLogin();
      return;
    }
    // kakao/naver는 기존 mock 동작 유지
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
              disabled={loggingIn}
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
          계속 진행하면 이용약관과{" "}
          <Text style={styles.footerLink} onPress={() => router.push("/legal/privacy-policy")}>
            개인정보처리방침
          </Text>
          에 동의한 것입니다
        </Text>
        <Text style={styles.overseasTransferNotice}>
          Google/Apple 로그인 시 이메일, 로그인 식별값이 해당 사업자의 해외 서버로 전송될 수
          있습니다. 자세한 내용은 개인정보처리방침의 국외 이전 항목을 확인해주세요.
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
  footerLink: {
    color: "#2DD4BF",
    textDecorationLine: "underline",
  },
  overseasTransferNotice: {
    color: "#4D4D52",
    fontSize: 10,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 14,
  },
});
