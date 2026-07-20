import React from "react";
import { View, Text, Pressable } from "react-native";
import { Link, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppLogo } from "@/components/ui/AppLogo";
import { colors } from "@/lib/theme";

export type SidebarRoute = {
  name: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  path: any;
  exact?: boolean;
};

interface WebSidebarProps {
  routes: SidebarRoute[];
}

export function WebSidebar({ routes }: WebSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View
      className="w-64 bg-surface border-e border-border h-full py-6 px-4 hidden md:flex"
      style={{ minHeight: "100vh" }}
    >
      <View className="mb-10 ps-2">
        <AppLogo variant="compact" onPress={() => router.push(routes[0].path)} />
      </View>

      <View className="flex-1 gap-2">
        {routes.map((route) => {
          const isActive = route.exact
            ? pathname === route.path
            : pathname.startsWith(route.path) &&
              (pathname === route.path || pathname.charAt(route.path.length) === "/");

          return (
            <Link href={route.path} key={route.name} asChild>
              <Pressable
                className={`flex-row items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive ? "bg-purple-10" : "hover:bg-sand"
                }`}
              >
                <Ionicons
                  name={isActive ? (route.icon.replace("-outline", "") as any) : route.icon}
                  size={22}
                  color={isActive ? colors.purple : colors.ink2}
                />
                <Text
                  className={`text-base font-rubik ${
                    isActive ? "text-purple font-bold" : "text-ink font-medium"
                  }`}
                >
                  {route.title}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}
