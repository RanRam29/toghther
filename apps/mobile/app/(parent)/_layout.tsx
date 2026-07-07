import { Stack } from "expo-router";

export default function ParentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="match-detail"
        options={{ presentation: "card", animation: "slide_from_end" }}
      />
      <Stack.Screen
        name="child-details"
        options={{ presentation: "card", animation: "slide_from_end" }}
      />
    </Stack>
  );
}
