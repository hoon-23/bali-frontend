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
  { id: "kakao", label: "카카오로 시작하기", backgroundColor: "#FEE500", textColor: "#191919" },
  { id: "naver", label: "네이버로 시작하기", backgroundColor: "#03C75A", textColor: "#FFFFFF" },
  { id: "apple", label: "Apple로 시작하기", backgroundColor: "#FFFFFF", textColor: "#000000" },
  { id: "google", label: "Google로 시작하기", backgroundColor: "#4285F4", textColor: "#FFFFFF" },
];

export default function LoginScreen() {
  const router = useRouter();

  const handleSocialLogin = () => {
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
        <Text style={styles.wordmark}>Bali</Text>
        <Text style={styles.tagline}>강력한 근력 운동 추적</Text>

        <View style={styles.buttonGroup}>
          {SOCIAL_PROVIDERS.map((provider) => (
            <Pressable
              key={provider.id}
              style={[styles.button, { backgroundColor: provider.backgroundColor }]}
              onPress={handleSocialLogin}
            >
              <Text style={[styles.buttonText, { color: provider.textColor }]}>
                {provider.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.footer}>
          로그인 시 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.
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
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 96,
    gap: 8,
  },
  wordmark: {
    color: "#FFFFFF",
    fontSize: 40,
    fontWeight: "700",
  },
  tagline: {
    color: "#A0A0A0",
    fontSize: 14,
    marginBottom: 32,
  },
  buttonGroup: {
    width: "100%",
    gap: 12,
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
  footer: {
    color: "#6B6B6B",
    fontSize: 12,
    textAlign: "center",
    marginTop: 24,
  },
});
