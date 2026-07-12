import { useRouter, useSegments } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";

type StaffNavItem = {
  key: string;
  label: string;
  href: string;
  segment: string;
};

export function StaffNav() {
  const { t } = useTranslation();
  const router = useRouter();
  const segments = useSegments() as string[];

  const current = segments[segments.length - 1] ?? "dashboard";

  const items: StaffNavItem[] = [
    {
      key: "dashboard",
      label: t("staff.navDashboard"),
      href: "/(staff)/dashboard",
      segment: "dashboard",
    },
    {
      key: "verification",
      label: t("staff.navVerification"),
      href: "/(staff)/verification",
      segment: "verification",
    },
    {
      key: "users",
      label: t("staff.navUsers"),
      href: "/(staff)/users",
      segment: "users",
    },
    {
      key: "matches",
      label: t("staff.navMatches"),
      href: "/(staff)/matches",
      segment: "matches",
    },
    {
      key: "audit",
      label: t("staff.navAudit"),
      href: "/(staff)/audit",
      segment: "audit",
    },
    {
      key: "children",
      label: t("staff.navChildren"),
      href: "/(staff)/children",
      segment: "children",
    },
    {
      key: "ops",
      label: t("staff.navOps", "חמ״ל"),
      href: "/(staff)/ops",
      segment: "ops",
    },
    {
      key: "analytics",
      label: t("staff.navAnalytics", "אנליטיקה"),
      href: "/(staff)/analytics",
      segment: "analytics",
    },
    {
      key: "config",
      label: t("staff.navConfig"),
      href: "/(staff)/config",
      segment: "config",
    },
  ];

  const activeSegment =
    segments.includes("users") ? "users"
    : segments.includes("children") ? "children"
    : segments.includes("matches") ? "matches"
    : segments.includes("audit") ? "audit"
    : segments.includes("ops") ? "ops"
    : segments.includes("analytics") ? "analytics"
    : segments.includes("review") ? "verification"
    : current;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="border-b border-border bg-surface px-4"
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
              active ? "border-purple" : "border-transparent"
            }`}
          >
            <Text
              className={`text-sm font-semibold font-rubik ${
                active ? "text-purple" : "text-ink-2"
              }`}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
