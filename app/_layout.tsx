import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="workout/[sessionId]"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="workout/summary" options={{ presentation: "modal" }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
