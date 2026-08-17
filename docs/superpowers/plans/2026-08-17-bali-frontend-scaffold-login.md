# bali-frontend Scaffold + Login Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a new Expo (TypeScript) project at `/Users/hoon/IdeaProject/bali-frontend` with Expo Router, TanStack Query, and Zustand wired in, and build a static (UI-only, no real OAuth) login screen that navigates to a stub home screen.

**Architecture:** `create-expo-app` with the `blank-typescript` template gives a clean slate (no pre-wired router/tabs to strip out). Expo Router is added manually and driven by the `app/` directory convention (file path = route). A single `QueryClientProvider` wraps the app in the root layout for future data-fetching use; no queries are written yet. Zustand is installed but not wired to anything yet — no global state is needed for a static login screen.

**Tech Stack:** Expo SDK 57, TypeScript, Expo Router 57.x, @tanstack/react-query 5.x, zustand 5.x, expo-linear-gradient 57.x, npm.

**Spec:** No separate spec file was written — the design was proposed and approved in-chat during this conversation (superpowers:brainstorming, architectural path), then handed directly to this plan per explicit user request to skip extra process overhead for this small scaffold-only scope. This plan document is the durable record of that approved design.

## Global Constraints

- Language: TypeScript (user chose this explicitly over JS)
- Package manager: npm (Expo default)
- No automated test framework is set up in this plan — this scope is UI-only scaffolding; verification is done by running `npx expo start` and checking the rendered screen (Expo Go on a physical device, or iOS Simulator once Xcode finishes installing)
- No real OAuth/social-login integration in this plan — buttons navigate to a stub `/home` route on press
- Social login buttons: Kakao / Naver / Apple / Google, in that order (Facebook was dropped — bali-api's `SocialTokenVerifier` has no Facebook provider; decision already made in a prior session, see project memory `project_login_profile_screen_reference.md`)
- Dark theme, teal radial-glow background per the approved mockup reference
- User has no prior React/React Native experience (JSP/JS background) — code should stay simple and idiomatic, no premature abstraction

---

## Task 1: Scaffold the Expo Project & Install Dependencies

**Files:**
- Create: entire project scaffold at `/Users/hoon/IdeaProject/bali-frontend` (via `create-expo-app` CLI)
- Modify: `package.json` (`main` field)
- Modify: `app.json` (`scheme` field)
- Delete: `App.tsx` (dead code once `main` points to `expo-router/entry`)
- Create: `docs/superpowers/plans/2026-08-17-bali-frontend-scaffold-login.md` (this plan, copied in)

**Interfaces:**
- Produces: a working Expo TypeScript project with `expo-router`, `@tanstack/react-query`, `zustand`, and `expo-linear-gradient` installed and ready to import in Task 2/3.

- [ ] **Step 1: Scaffold the project**

Run from the parent directory:
```bash
cd /Users/hoon/IdeaProject
npx create-expo-app@latest bali-frontend --template blank-typescript
```
Expected: command completes, creates `package.json`, `app.json`, `App.tsx`, `tsconfig.json`, `babel.config.js` inside `bali-frontend/`.

- [ ] **Step 2: Verify git was initialized**

```bash
cd /Users/hoon/IdeaProject/bali-frontend
git status
```
Expected: shows a git repo with an initial commit (Expo's CLI runs `git init` + initial commit automatically). If it instead errors with "not a git repository", run `git init` and commit the scaffold as-is before continuing.

- [ ] **Step 3: Install Expo Router and its peer dependencies**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```
Expected: packages added to `package.json` at versions compatible with the installed Expo SDK.

- [ ] **Step 4: Install TanStack Query and Zustand**

```bash
npm install @tanstack/react-query zustand
```
Expected: both added to `package.json` dependencies.

- [ ] **Step 5: Install expo-linear-gradient**

```bash
npx expo install expo-linear-gradient
```

- [ ] **Step 6: Point the app entry at Expo Router**

Edit `package.json`, change:
```json
"main": "node_modules/expo/AppEntry.js"
```
to:
```json
"main": "expo-router/entry"
```
(If the template's `package.json` already has a different `main` value, replace whatever is there with `"expo-router/entry"`.)

- [ ] **Step 7: Add a URL scheme for deep linking**

Edit `app.json`, inside the `"expo"` object add:
```json
"scheme": "bali-frontend"
```

- [ ] **Step 8: Remove the now-unused default entry file**

```bash
rm App.tsx
```
This file was the entry point before Step 6; `expo-router/entry` replaces it and nothing will import `App.tsx` anymore.

- [ ] **Step 9: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```
Expected: no errors (there's no `app/` directory yet, so this just confirms the scaffold + new deps didn't break the TS config).

- [ ] **Step 10: Bring the plan document into the project**

```bash
mkdir -p docs/superpowers/plans
cp "/private/tmp/claude-501/-Users-hoon-IdeaProject-bali-frontend/514fa938-83d1-4e71-88d3-a7069693f28d/scratchpad/2026-08-17-bali-frontend-scaffold-login.md" docs/superpowers/plans/2026-08-17-bali-frontend-scaffold-login.md
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: install expo-router, tanstack-query, zustand, expo-linear-gradient"
```

---

## Task 2: Navigation Skeleton (root layout, index placeholder, home stub)

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/index.tsx` (temporary placeholder — replaced in Task 3)
- Create: `app/home.tsx` (stub screen, stays as-is after this task)

**Interfaces:**
- Consumes: `expo-router`'s `Stack`, `Link`, `useRouter` (installed in Task 1)
- Produces: a `/` route and a `/home` route the app can navigate between; the `QueryClientProvider` wrapper that Task 3+ (and future work) can rely on being present at the root.

- [ ] **Step 1: Create the root layout**

Create `app/_layout.tsx`:
```tsx
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Create the home stub screen**

Create `app/home.tsx`:
```tsx
import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>홈 화면 (준비 중)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0B0F",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 18,
  },
});
```

- [ ] **Step 3: Create a temporary index placeholder**

Create `app/index.tsx`:
```tsx
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function IndexScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>로그인 화면 자리 (Task 3에서 교체 예정)</Text>
      <Link href="/home" style={styles.link}>
        홈으로 이동 (임시)
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0B0F",
    gap: 16,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  link: {
    color: "#2DD4BF",
    fontSize: 16,
    textDecorationLine: "underline",
  },
});
```

- [ ] **Step 4: Verify navigation works**

```bash
npx expo start
```
Open in Expo Go (scan QR) or press `i` for iOS Simulator if Xcode is ready by now.
Expected: the placeholder screen shows the Korean placeholder text and an underlined "홈으로 이동 (임시)" link; tapping it navigates to the home stub, which shows "홈 화면 (준비 중)" on a dark background. Stop the dev server (Ctrl+C) once confirmed.

- [ ] **Step 5: Commit**

```bash
git add app/
git commit -m "feat: add expo-router navigation skeleton with home stub"
```

---

## Task 3: Login Screen UI + Navigation Wiring

**Files:**
- Modify: `app/index.tsx` (replace the Task 2 placeholder with the full login screen)

**Interfaces:**
- Consumes: `app/home.tsx` route (Task 2), `expo-linear-gradient`'s `LinearGradient` (Task 1), `expo-router`'s `useRouter`
- Produces: the final login screen shown as the app's first route

- [ ] **Step 1: Replace `app/index.tsx` with the full login screen**

```tsx
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
```

- [ ] **Step 2: Verify the login screen renders and navigates**

```bash
npx expo start
```
Expected: dark screen with a teal radial glow fading toward the bottom, "Bali" wordmark, tagline, four colored buttons (yellow/green/white/blue) labeled for Kakao/Naver/Apple/Google, and small footer consent text. Tapping any button navigates to the `/home` stub screen. Stop the dev server (Ctrl+C) once confirmed.

- [ ] **Step 3: Commit**

```bash
git add app/index.tsx
git commit -m "feat: build login screen UI with social login buttons"
```

---

## Self-Review Notes

- **Spec coverage:** Section 1 (tooling) → Task 1. Section 2 (folder/nav) → Task 2. Section 3 (login UI) → Task 3, Step 1. Section 4 (button behavior) → Task 3, Step 1 (`handleSocialLogin`). Section 5 (testing) → covered by Global Constraints (manual visual verification, no automated tests for this scope).
- **Placeholder scan:** none found — every step has concrete commands or full file contents.
- **Type consistency:** `SocialProvider["id"]` type is defined and used consistently in Task 3; no cross-task type mismatches (Task 2's placeholder code is fully replaced, not extended, in Task 3).
