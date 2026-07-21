import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { AppLogo } from "@/components/ui/AppLogo";

import { AdminMfaModal } from "@/components/admin/AdminMfaModal";
import { StaffNav } from "@/components/admin/StaffNav";
import { StaffPageWidth } from "@/components/admin/StaffPageWidth";
import { useAdminMfa } from "@/hooks/useAdminMfa";
import { isAdminUser, isSupervisorUser } from "@/lib/staff-auth";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";

interface StaffShellProps {
  children: ReactNode;
}

export function StaffShell({ children }: StaffShellProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const reset = useAuthStore((s) => s.reset);

  const isAdmin = isAdminUser(session, profile);
  const isSupervisor = isSupervisorUser(session, profile);
  const mfa = useAdminMfa(isAdmin);

  async function handleLogout() {
    await supabase.auth.signOut();
    reset();
    router.replace("/(auth)/login");
  }

  const subtitle = isAdmin
    ? t("staff.adminSubtitle")
    : isSupervisor
      ? t("staff.supervisorSubtitle")
      : t("staff.verificationQueue");

  return (
    <View className="flex-1 bg-bg min-h-screen">
      <View className="bg-surface border-b border-border py-4 w-full items-center">
        <StaffPageWidth className="px-6 flex-row items-center justify-between">
          <Pressable onPress={handleLogout} className="active:opacity-80">
            <Text className="text-teal font-semibold font-rubik">
              {t("staff.logout")}
            </Text>
          </Pressable>
          <View className="items-end gap-1">
            <AppLogo variant="compact" />
            <Text className="text-xs text-ink-2 text-end">{subtitle}</Text>
          </View>
        </StaffPageWidth>
      </View>
      {isAdmin && mfa.needsMfa ? (
        <Pressable
          onPress={() => mfa.setShowModal(true)}
          className="bg-amber/15 border-b border-amber py-3 active:opacity-90 w-full items-center"
        >
          <StaffPageWidth className="px-6">
            <Text className="text-amber text-sm font-semibold text-right font-rubik">
              {t("staff.mfaBanner")}
            </Text>
          </StaffPageWidth>
        </Pressable>
      ) : null}
      {isAdmin ? <StaffNav /> : null}
      <View className="flex-1 w-full items-center">
        <StaffPageWidth className="flex-1">{children}</StaffPageWidth>
      </View>
      <AdminMfaModal
        visible={mfa.showModal}
        onClose={() => mfa.setShowModal(false)}
        onVerified={mfa.onVerified}
      />
    </View>
  );
}

/** @deprecated use StaffShell */
export const AdminShell = StaffShell;
