import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="workout/[sessionId]"
          options={{ presentation: "modal" }}
        />
        <Stack.Screen name="workout/summary" options={{ presentation: "modal" }} />
      </Stack>
    </QueryClientProvider>
  );
}
