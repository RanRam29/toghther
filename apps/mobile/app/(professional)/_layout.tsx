import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

export default function ProfessionalLayout() {
  const { t } = useTranslation();

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
      <Tabs.Screen name="profile" options={{ title: t("professional.profile") }} />
      <Tabs.Screen name="browse" options={{ title: t("professional.browse") }} />
      <Tabs.Screen name="documents" options={{ title: t("professional.documents") }} />
    </Tabs>
  );
}
