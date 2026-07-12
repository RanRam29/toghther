import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { StaffQueryFeedback } from "@/components/admin/StaffQueryFeedback";
import type { AdminUserFilters } from "@/lib/api/admin-users";
import { useStaffRoute } from "@/hooks/useStaffRoute";
import { useAdminUsers } from "@/hooks/useAdminUsers";

const ROLE_FILTERS: AdminUserFilters["role"][] = [
  "all",
  "parent",
  "professional",
  "supervisor",
  "admin",
];

export default function AdminUsersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAdmin, isReady } = useStaffRoute();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<AdminUserFilters["role"]>("all");
  const [suspendedOnly, setSuspendedOnly] = useState(false);

  const filters: AdminUserFilters = { search, role, suspendedOnly };
  const { data: users = [], isLoading, isError, error, refetch, isRefetching } =
    useAdminUsers(filters);

  useEffect(() => {
    if (isReady && !isAdmin) {
      router.replace("/(staff)/verification" as never);
    }
  }, [isReady, isAdmin, router]);

  if (!isReady || !isAdmin) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#534AB7" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 px-6 py-6"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <Text className="text-2xl font-bold text-ink mb-4 font-rubik text-right">
        {t("staff.usersTitle")}
      </Text>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={t("staff.usersSearch")}
        placeholderTextColor="#918D84"
        className="bg-surface border border-border rounded-card px-4 py-3 text-ink text-right mb-4"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        {ROLE_FILTERS.map((r) => (
          <Pressable
            key={r ?? "all"}
            onPress={() => setRole(r)}
            className={`px-4 py-2 rounded-full mr-2 border ${
              role === r
                ? "bg-purple border-purple"
                : "bg-surface border-border"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                role === r ? "text-white" : "text-ink-2"
              }`}
            >
              {t(`staff.roleFilter.${r ?? "all"}`)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable
        onPress={() => setSuspendedOnly((v) => !v)}
        className="self-end mb-4 active:opacity-80"
      >
        <Text className={suspendedOnly ? "text-coral font-semibold" : "text-ink-2"}>
          {t("staff.suspendedOnly")} {suspendedOnly ? "✓" : ""}
        </Text>
      </Pressable>

      <StaffQueryFeedback
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!isLoading && !isError && users.length === 0}
        emptyMessage={t("staff.usersEmpty")}
        onRetry={() => void refetch()}
      />

      {!isLoading && !isError
        ? users.map((user) => (
          <Pressable
            key={user.id}
            onPress={() => router.push(`/(staff)/users/${user.id}` as never)}
            className="bg-surface border border-border rounded-card p-4 mb-3 active:opacity-90"
          >
            <View className="flex-row justify-between items-start mb-1">
              {user.suspended_at ? (
                <Text className="text-xs text-coral font-semibold">
                  {t("staff.suspended")}
                </Text>
              ) : (
                <View />
              )}
              <Text className="text-base font-bold text-ink font-rubik">
                {user.full_name ?? "—"}
              </Text>
            </View>
            <Text className="text-sm text-ink-2 text-right">
              {t(`staff.roleFilter.${user.role}`)} · {user.area ?? "—"}
            </Text>
            <Text className="text-sm text-ink-2 text-right">{user.phone}</Text>
          </Pressable>
        ))
        : null}
      <View className="h-8" />
    </ScrollView>
  );
}
