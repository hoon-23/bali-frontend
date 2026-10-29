import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { login as kakaoLogin } from "@react-native-seoul/kakao-login";
import NaverLogin from "@react-native-seoul/naver-login";
import { apiClient } from "../lib/api/client";
import { LAST_LOGIN_PROVIDER_KEY } from "../lib/auth/lastLoginProvider";
import { useAuthStore } from "../store/authStore";
import { setRefreshToken } from "../lib/auth/tokenStorage";
import { appAlert } from "../lib/alert";

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


export default function LoginScreen() {
  const router = useRouter();
  const [lastProviderId, setLastProviderId] = useState<SocialProvider["id"] | null>(null);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const [loggingIn, setLoggingIn] = useState(false);

  // 이미 로그인된 상태로 이 화면이 뜨는 경우(Live Activity "운동 종료" 버튼이 앱 루트 주소를 열 때)는
  // 로그인 화면을 보여주지 않고 원래 화면으로 되돌린다. 콜드 스타트는 마운트 시점에 아직
  // 미인증이라 여기 걸리지 않고, 부트스트랩 리다이렉트(_layout)가 그대로 처리한다.
  useEffect(() => {
    if (!useAuthStore.getState().isAuthenticated) return;
    if (router.canGoBack()) router.back();
    else router.replace("/home");
    // 마운트 시점 한 번만 판단한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(LAST_LOGIN_PROVIDER_KEY).then((storedId) => {
      if (storedId && SOCIAL_PROVIDERS.some((provider) => provider.id === storedId)) {
        setLastProviderId(storedId as SocialProvider["id"]);
      }
    });
  }, []);

  const finishLogin = async (provider: SocialProvider["id"], token: string, authorizationCode?: string) => {
    // 백엔드 AuthProvider enum(GOOGLE/APPLE/...)은 대문자 고정이라 맞춰서 보낸다.
    // authorizationCode는 Apple 전용(탈퇴 시 토큰 revoke용)이고 1회용·약 5분 유효라 로그인 요청에 바로 실어 보낸다.
    const { data } = await apiClient.post("/api/v1/auth/login", {
      provider: provider.toUpperCase(),
      token,
      ...(authorizationCode ? { authorizationCode } : {}),
    });
    setAccessToken(data.accessToken);
    await setRefreshToken(data.refreshToken);
    await AsyncStorage.setItem(LAST_LOGIN_PROVIDER_KEY, provider);
    router.replace("/home");
  };

  const handleGoogleLogin = async () => {
    setLoggingIn(true);
    let statusCodes: typeof import("@react-native-google-signin/google-signin")["statusCodes"] | undefined;
    try {
      // 최상단에서 import/configure하면 네이티브 모듈을 즉시 바인딩하려 시도해서, 이 모듈이
      // 없는 런타임(Expo Go 등)에서는 로그인 화면 자체가 못 뜬다 — Apple 로그인과 동일하게
      // 버튼을 누른 시점에만 로드한다.
      const googleSignInModule: typeof import("@react-native-google-signin/google-signin") = require("@react-native-google-signin/google-signin");
      const { GoogleSignin } = googleSignInModule;
      statusCodes = googleSignInModule.statusCodes;
      GoogleSignin.configure({ iosClientId: "803810989144-q9q2upa4sjjeda3biu455gi3jl99a5pn.apps.googleusercontent.com" });
      const response = await GoogleSignin.signIn();
      // 시스템 OAuth 시트에서 취소하면 에러를 던지지 않고 이 형태로 resolve된다.
      if (response.type === "cancelled") return;
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error("Google 로그인에서 idToken을 받지 못했습니다.");
      await finishLogin("google", idToken);
    } catch (error: any) {
      if (error?.code !== statusCodes?.SIGN_IN_CANCELLED) {
        appAlert("로그인 실패", "Google 로그인 중 문제가 발생했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoggingIn(true);
    try {
      // 최상단에서 import하면 네이티브 모듈을 즉시 바인딩하려 시도해서, 이 capability가
      // 빠진 빌드(무료 Apple Personal Team 서명)에서는 로그인 화면 자체가 못 뜬다.
      const AppleAuthentication: typeof import("expo-apple-authentication") = require("expo-apple-authentication");
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error("Apple 로그인에서 identityToken을 받지 못했습니다.");
      await finishLogin("apple", credential.identityToken, credential.authorizationCode ?? undefined);
    } catch (error: any) {
      console.error("[apple-login]", error?.code, error?.message, error?.response?.status, error?.response?.data);
      if (error?.code !== "ERR_REQUEST_CANCELED") {
        appAlert("로그인 실패", "Apple 로그인 중 문제가 발생했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleKakaoLogin = async () => {
    setLoggingIn(true);
    try {
      const token = await kakaoLogin();
      if (!token.idToken) throw new Error("Kakao 로그인에서 idToken을 받지 못했습니다. OIDC 설정을 확인해주세요.");
      await finishLogin("kakao", token.idToken);
    } catch (error: any) {
      console.error("[kakao-login]", error?.code, error?.message, error?.response?.status, JSON.stringify(error?.response?.data));
      if (error?.code !== "E_CANCELLED_OPERATION") {
        appAlert("로그인 실패", "Kakao 로그인 중 문제가 발생했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleNaverLogin = async () => {
    setLoggingIn(true);
    try {
      const response = await NaverLogin.login();
      if (!response.isSuccess || !response.successResponse) {
        console.error("[naver-login] failureResponse", JSON.stringify(response.failureResponse));
        // 사용자가 직접 취소한 경우엔 실패 알림을 띄우지 않는다.
        if (!response.failureResponse?.isCancel) {
          appAlert("로그인 실패", "Naver 로그인 중 문제가 발생했습니다. 다시 시도해주세요.");
        }
        return;
      }
      await finishLogin("naver", response.successResponse.accessToken);
    } catch (error: any) {
      console.error("[naver-login]", error?.code, error?.message, error?.response?.status, error?.response?.data);
      appAlert("로그인 실패", "Naver 로그인 중 문제가 발생했습니다. 다시 시도해주세요.");
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
    if (providerId === "kakao") {
      handleKakaoLogin();
      return;
    }
    handleNaverLogin();
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
          <Image source={require("../assets/images/splash/swayt-logo.png")} style={styles.logo} resizeMode="contain" />
          <Text style={styles.tagline}>세트별 기록, 주간·월간 리포트</Text>
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
  // 원본 비율(992x492)을 유지한다
  logo: {
    width: 200,
    height: 99,
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
