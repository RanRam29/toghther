import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { AdminMfaModal } from "@/components/admin/AdminMfaModal";
import { StaffNav } from "@/components/admin/StaffNav";
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
    router.replace("/(auth)/role-select");
  }

  const subtitle = isAdmin
    ? t("staff.adminSubtitle")
    : isSupervisor
      ? t("staff.supervisorSubtitle")
      : t("staff.verificationQueue");

  return (
    <View className="flex-1 bg-bg min-h-screen">
      <View className="bg-surface border-b border-border px-6 py-4 flex-row items-center justify-between">
        <Pressable onPress={handleLogout} className="active:opacity-80">
          <Text className="text-teal font-semibold font-rubik">
            {t("staff.logout")}
          </Text>
        </Pressable>
        <View className="items-end">
          <Text className="text-lg font-bold text-purple font-rubik">
            {t("staff.brand")}
          </Text>
          <Text className="text-xs text-ink-2">{subtitle}</Text>
        </View>
      </View>
      {isAdmin && mfa.needsMfa ? (
        <Pressable
          onPress={() => mfa.setShowModal(true)}
          className="bg-amber/15 border-b border-amber px-6 py-3 active:opacity-90"
        >
          <Text className="text-amber text-sm font-semibold text-right font-rubik">
            {t("staff.mfaBanner")}
          </Text>
        </Pressable>
      ) : null}
      {isAdmin ? <StaffNav /> : null}
      <View className="flex-1">{children}</View>
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
