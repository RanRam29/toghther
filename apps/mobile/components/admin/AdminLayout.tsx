import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View, ScrollView } from "react-native";
import { useRouter, useSegments } from "expo-router";

import { AppLogo } from "@/components/ui/AppLogo";
import { AdminMfaModal } from "@/components/admin/AdminMfaModal";
import { useAdminMfa } from "@/hooks/useAdminMfa";
import { isAdminUser, isSupervisorUser } from "@/lib/staff-auth";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";

interface AdminLayoutProps {
  children: ReactNode;
}

type NavItem = {
  key: string;
  label: string;
  href: string;
  segment: string;
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const segments = useSegments() as string[];
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

  const current = segments[segments.length - 1] ?? "dashboard";
  const activeSegment =
    segments.includes("users") ? "users"
    : segments.includes("children") ? "children"
    : segments.includes("matches") ? "matches"
    : segments.includes("audit") ? "audit"
    : segments.includes("ops") ? "ops"
    : segments.includes("analytics") ? "analytics"
    : segments.includes("review") ? "verification"
    : current;

  const items: NavItem[] = [
    { key: "dashboard", label: t("staff.navDashboard", "דשבורד"), href: "/(staff)/dashboard", segment: "dashboard" },
    { key: "verification", label: t("staff.navVerification", "אימות משלבות"), href: "/(staff)/verification", segment: "verification" },
    { key: "users", label: t("staff.navUsers", "משתמשים"), href: "/(staff)/users", segment: "users" },
    { key: "matches", label: t("staff.navMatches", "התאמות"), href: "/(staff)/matches", segment: "matches" },
    { key: "audit", label: t("staff.navAudit", "יומן פעולות"), href: "/(staff)/audit", segment: "audit" },
    { key: "children", label: t("staff.navChildren", "ילדים"), href: "/(staff)/children", segment: "children" },
    { key: "ops", label: t("staff.navOps", "חמ״ל"), href: "/(staff)/ops", segment: "ops" },
    { key: "analytics", label: t("staff.navAnalytics", "אנליטיקה"), href: "/(staff)/analytics", segment: "analytics" },
    { key: "config", label: t("staff.navConfig", "הגדרות"), href: "/(staff)/config", segment: "config" },
  ];

  const subtitle = isAdmin
    ? t("staff.adminSubtitle", "אזור מנהל")
    : isSupervisor
      ? t("staff.supervisorSubtitle", "אזור מפקח")
      : t("staff.verificationQueue", "תור אימות");

  return (
    <View className="flex-1 min-h-screen md:flex-row-reverse bg-[#fcf8ff]">
      {/* Sidebar for Desktop */}
      <View className="hidden md:flex w-64 bg-white border-l border-[#e5e1eb] h-full py-6">
        <View className="px-6 mb-8 items-end">
          <AppLogo variant="compact" />
          <Text className="text-xs text-[#474553] mt-1 font-rubik">{subtitle}</Text>
        </View>

        <ScrollView className="flex-1 w-full">
          {isAdmin ? items.map((item) => {
            const active =
              activeSegment === item.segment ||
              (item.segment === "verification" && segments.includes("review"));
            return (
              <Pressable
                key={item.key}
                onPress={() => router.push(item.href as never)}
                className={`px-6 py-4 border-r-4 ${
                  active ? "border-[#534ab7] bg-[#534ab7]/5" : "border-transparent hover:bg-[#f6f2fc]"
                }`}
              >
                <Text
                  className={`text-base text-right font-rubik ${
                    active ? "font-bold text-[#3b309e]" : "font-medium text-[#1c1b22]"
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }) : null}
        </ScrollView>

        <View className="px-6 mt-4 pb-4">
          <Pressable onPress={handleLogout} className="active:opacity-80 py-3">
            <Text className="text-[#ba1a1a] font-semibold text-right font-rubik">
              {t("staff.logout", "התנתק")}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1 bg-[#fcf8ff] h-full">
        {/* Mobile Header (Hidden on Desktop) */}
        <View className="md:hidden bg-white border-b border-[#e5e1eb] py-4 w-full items-center">
          <View className="w-full px-6 flex-row items-center justify-between">
            <Pressable onPress={handleLogout} className="active:opacity-80">
              <Text className="text-[#ba1a1a] font-semibold font-rubik">
                {t("staff.logout", "התנתק")}
              </Text>
            </Pressable>
            <View className="items-end gap-1">
              <AppLogo variant="compact" />
              <Text className="text-xs text-[#474553] text-end font-rubik">{subtitle}</Text>
            </View>
          </View>
        </View>

        {/* Mobile Navigation (Hidden on Desktop) */}
        {isAdmin ? (
          <View className="md:hidden border-b border-[#e5e1eb] bg-white w-full items-center">
            <View className="w-full">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="px-4 flex-row-reverse"
              >
                {items.map((item) => {
                  const active =
                    activeSegment === item.segment ||
                    (item.segment === "verification" && segments.includes("review"));
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => router.push(item.href as never)}
                      className={`px-4 py-3 border-b-2 ${
                        active ? "border-[#534ab7]" : "border-transparent"
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold font-rubik ${
                          active ? "text-[#3b309e]" : "text-[#474553]"
                        }`}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        ) : null}

        {/* MFA Banner */}
        {isAdmin && mfa.needsMfa ? (
          <Pressable
            onPress={() => mfa.setShowModal(true)}
            className="bg-[#ffdad6] border-b border-[#ba1a1a] py-3 active:opacity-90 w-full items-center"
          >
            <View className="w-full max-w-6xl px-6">
              <Text className="text-[#93000a] text-sm font-semibold text-right font-rubik">
                {t("staff.mfaBanner", "נדרש אימות דו-שלבי (MFA) לביצוע פעולות רגישות. לחץ כאן להגדרת המכשיר.")}
              </Text>
            </View>
          </Pressable>
        ) : null}

        {/* Page Content */}
        <View className="flex-1 w-full items-center">
          <View className="w-full max-w-6xl flex-1">{children}</View>
        </View>
      </View>

      <AdminMfaModal
        visible={mfa.showModal}
        onClose={() => mfa.setShowModal(false)}
        onVerified={mfa.onVerified}
      />
    </View>
  );
}
