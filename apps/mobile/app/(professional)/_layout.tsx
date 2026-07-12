import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

import { useVerificationGate } from "@/hooks/useVerificationGate";

function ProfessionalTabs() {
  const { t } = useTranslation();
  useVerificationGate();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0F6E56",
        tabBarInactiveTintColor: "#918D84",
        tabBarStyle: { backgroundColor: "#FFFFFF", borderTopColor: "#E5E2DA" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("professional.homeTitle") }} />
      <Tabs.Screen name="today" options={{ title: t("professional.todayTitle") }} />
      <Tabs.Screen name="profile" options={{ title: t("professional.profile") }} />
      <Tabs.Screen name="browse" options={{ title: t("professional.browse") }} />
      <Tabs.Screen name="documents" options={{ title: t("professional.documents") }} />
      <Tabs.Screen
        name="pending"
        options={{ href: null, title: t("professional.pendingTitle") }}
      />
    </Tabs>
  );
}

export default ProfessionalTabs;
