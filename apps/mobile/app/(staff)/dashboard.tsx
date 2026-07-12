import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { MetricCard } from "@/components/admin/MetricCard";
import { StaffQueryFeedback } from "@/components/admin/StaffQueryFeedback";
import { useStaffRoute } from "@/hooks/useStaffRoute";
import { usePlatformMetrics } from "@/hooks/useAdminDashboard";

export default function AdminDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAdmin, isReady } = useStaffRoute();
  const metrics = usePlatformMetrics();

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

  const m = metrics.data;

  return (
    <ScrollView
      className="flex-1 px-6 py-6"
      refreshControl={
        <RefreshControl
          refreshing={metrics.isRefetching}
          onRefresh={() => {
            void metrics.refetch();
          }}
        />
      }
    >
      <Text className="text-2xl font-bold text-ink mb-2 font-rubik text-right">
        {t("staff.dashboardTitle")}
      </Text>
      <Text className="text-sm text-ink-2 mb-6 text-right">
        {t("staff.dashboardSubtitle")}
      </Text>

      {metrics.isLoading || metrics.isError ? (
        <StaffQueryFeedback
          isLoading={metrics.isLoading}
          isError={metrics.isError}
          error={metrics.error}
          onRetry={() => void metrics.refetch()}
        />
      ) : m ? (
        <View className="flex-row flex-wrap gap-3 justify-end">
          <MetricCard
            label={t("staff.metricVerified")}
            value={m.verifiedProfessionals}
            highlight="success"
            onPress={() => router.push("/(staff)/verification" as never)}
          />
          <MetricCard
            label={t("staff.metricPending")}
            value={m.pendingVerification}
            onPress={() => router.push("/(staff)/verification" as never)}
          />
          <MetricCard
            label={t("staff.metricSlaOverdue")}
            value={m.slaOverdue}
            highlight={m.slaOverdue > 0 ? "warning" : "default"}
            onPress={() => router.push("/(staff)/verification" as never)}
          />
          <MetricCard
            label={t("staff.metricParents")}
            value={m.activeParents}
            onPress={() => router.push("/(staff)/users" as never)}
          />
          <MetricCard
            label={t("staff.metricChildren")}
            value={m.activeChildren}
          />
          <MetricCard
            label={t("staff.metricOpenRequests")}
            value={m.openRequests}
          />
          <MetricCard
            label={t("staff.metricActiveMatches")}
            value={m.activeMatches}
            onPress={() => router.push("/(staff)/matches" as never)}
          />
          <MetricCard
            label={t("staff.metricCheckinsToday")}
            value={m.checkinsToday}
          />
          <MetricCard
            label={t("staff.metricLogsToday")}
            value={m.dailyLogsToday}
          />
        </View>
      ) : null}



      <View className="h-8" />
    </ScrollView>
  );
}
