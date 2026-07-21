import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { AppLogo } from "@/components/ui/AppLogo";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";

interface AdminShellProps {
  children: ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const reset = useAuthStore((s) => s.reset);

  async function handleLogout() {
    await supabase.auth.signOut();
    reset();
    router.replace("/(auth)/login");
  }

  return (
    <View className="flex-1 bg-bg min-h-screen">
      <View className="bg-surface border-b border-border px-6 py-4 flex-row items-center justify-between">
        <Pressable onPress={handleLogout} className="active:opacity-80">
          <Text className="text-teal font-semibold font-rubik">
            {t("admin.logout")}
          </Text>
        </Pressable>
        <View className="items-end gap-1">
          <AppLogo variant="compact" />
          <Text className="text-xs text-ink-2 text-end">{t("admin.verificationQueue")}</Text>
        </View>
      </View>
      <View className="flex-1">{children}</View>
    </View>
  );
}
