import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { useVerificationGate } from "@/hooks/useVerificationGate";
import { getTabBarStyle } from "@/lib/platform";
import { colors } from "@/lib/theme";

function ProfessionalTabs() {
  const { t } = useTranslation();
  useVerificationGate();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.ink3,
        tabBarStyle: getTabBarStyle({ wide: true }),
        tabBarLabelStyle: { fontFamily: "Rubik_500Medium", fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("professional.homeTitle"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: t("professional.todayTitle"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("professional.profile"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: t("professional.browse"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: t("professional.documents"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pending"
        options={{ href: null, title: t("professional.pendingTitle") }}
      />
    </Tabs>
  );
}

export default ProfessionalTabs;
