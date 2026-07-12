import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { StaffShell } from "@/components/admin/StaffShell";
import { useStaffRoute } from "@/hooks/useStaffRoute";

export default function StaffLayout() {
  const { isReady, denied } = useStaffRoute();

  if (!isReady || denied) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator size="large" color="#534AB7" />
      </View>
    );
  }

  return (
    <StaffShell>
      <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="verification" />
        <Stack.Screen name="review/[id]" />
        <Stack.Screen name="users/index" />
        <Stack.Screen name="users/[id]" />
        <Stack.Screen name="children" />
        <Stack.Screen name="matches" />
        <Stack.Screen name="ops" />
        <Stack.Screen name="analytics" />
        <Stack.Screen name="audit" />
        <Stack.Screen name="config" />
        <Stack.Screen name="web-only" />
      </Stack>
    </StaffShell>
  );
}
