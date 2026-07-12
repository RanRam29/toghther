import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { StaffQueryFeedback } from "@/components/admin/StaffQueryFeedback";
import { useStaffRoute } from "@/hooks/useStaffRoute";
import {
  filterConcernedMatches,
  useAdminMatches,
} from "@/hooks/useAdminMatches";

export default function AdminMatchesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAdmin, isReady } = useStaffRoute();
  const [concernedOnly, setConcernedOnly] = useState(false);
  const { data: matches = [], isLoading, isError, error, refetch, isRefetching } =
    useAdminMatches();

  const visible = filterConcernedMatches(matches, concernedOnly);

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
      <Text className="text-2xl font-bold text-ink mb-2 font-rubik text-right">
        {t("staff.matchesTitle")}
      </Text>
      <Text className="text-sm text-ink-2 mb-4 text-right">
        {t("staff.matchesSubtitle")}
      </Text>

      <Pressable
        onPress={() => setConcernedOnly((v) => !v)}
        className={`self-end px-4 py-2 rounded-full border mb-4 ${
          concernedOnly
            ? "bg-amber border-amber"
            : "bg-surface border-border"
        }`}
      >
        <Text
          className={`text-sm font-semibold font-rubik ${
            concernedOnly ? "text-white" : "text-ink-2"
          }`}
        >
          {t("staff.concernedOnly")} {concernedOnly ? "✓" : ""}
        </Text>
      </Pressable>

      {isLoading || isError ? (
        <StaffQueryFeedback
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={() => void refetch()}
        />
      ) : visible.length === 0 ? (
        <Text className="text-ink-2 text-right">{t("staff.matchesEmpty")}</Text>
      ) : (
        visible.map((match) => (
          <View
            key={match.id}
            className={`bg-surface border rounded-card p-4 mb-3 ${
              match.isConcerned ? "border-amber" : "border-border"
            }`}
          >
            <View className="flex-row justify-between items-start mb-2">
              <Text
                className={`text-xs font-semibold ${
                  match.isConcerned ? "text-amber" : "text-teal"
                }`}
              >
                {match.isConcerned
                  ? t("staff.matchConcerned", {
                      days: match.daysSinceActivity,
                    })
                  : t("staff.matchHealthy", {
                      days: match.daysSinceActivity,
                    })}
              </Text>
              <Text className="text-base font-bold text-ink font-rubik">
                {match.child?.first_name ?? "—"} ·{" "}
                {match.professional?.display_name ?? "—"}
              </Text>
            </View>
            <Text className="text-xs text-ink-2 text-right">
              {t("staff.matchStarted", {
                date: new Date(match.started_at).toLocaleDateString("he-IL"),
              })}
            </Text>
            <Text className="text-xs text-ink-2 text-right mt-1">
              {t("staff.matchDuration", { days: match.daysSinceStart })}
            </Text>
          </View>
        ))
      )}
      <View className="h-8" />
    </ScrollView>
  );
}
