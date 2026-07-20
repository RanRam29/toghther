import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { View, useWindowDimensions } from "react-native";

import { useVerificationGate } from "@/hooks/useVerificationGate";
import { useNextActions } from "@/hooks/useNextActions";
import { useSmartLanding } from "@/hooks/useSmartLanding";
import { getTabBarStyle, isWeb, WEB_SIDEBAR_BREAKPOINT } from "@/lib/platform";
import { colors } from "@/lib/theme";
import { WebSidebar, type SidebarRoute } from "@/components/ui/WebSidebar";

function ProfessionalTabs() {
  const { t } = useTranslation();
  useVerificationGate();
  const { badges } = useNextActions("professional");
  useSmartLanding("professional");

  const { width } = useWindowDimensions();
  const showSidebar = isWeb && width >= WEB_SIDEBAR_BREAKPOINT;

  const routes: SidebarRoute[] = [
    { name: "index", title: t("professional.homeTitle"), icon: "home-outline", path: "/(professional)", exact: true },
    { name: "today", title: t("professional.todayTitle"), icon: "calendar-outline", path: "/(professional)/today" },
    { name: "profile", title: t("professional.profile"), icon: "person-outline", path: "/(professional)/profile" },
    { name: "browse", title: t("professional.browse"), icon: "search-outline", path: "/(professional)/browse" },
    { name: "documents", title: t("professional.documents"), icon: "document-text-outline", path: "/(professional)/documents" },
  ];

  return (
    <View className="flex-1 flex-row">
      {showSidebar && <WebSidebar routes={routes} />}
      <View className="flex-1 relative">
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.teal,
            tabBarInactiveTintColor: colors.ink3,
            tabBarStyle: showSidebar ? { display: "none" } : getTabBarStyle({ wide: true }),
            tabBarLabelStyle: { fontFamily: "Rubik_500Medium", fontSize: 11 },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: t("professional.homeTitle"),
              tabBarBadge: badges.pro_requests || undefined,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="today"
            options={{
              title: t("professional.todayTitle"),
              tabBarBadge: badges.pro_today || undefined,
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
          <Tabs.Screen
            name="request-detail"
            options={{ href: null, title: t("professional.childProfileTitle") }}
          />
          <Tabs.Screen
            name="attendance"
            options={{ href: null }}
          />
          <Tabs.Screen
            name="calendar"
            options={{ href: null }}
          />
          <Tabs.Screen
            name="child-details"
            options={{ href: null }}
          />
        </Tabs>
      </View>
    </View>
  );
}

export default ProfessionalTabs;
