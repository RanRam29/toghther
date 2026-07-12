import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { FunnelChart } from "@/components/admin/FunnelChart";
import { StaffQueryFeedback } from "@/components/admin/StaffQueryFeedback";
import {
  useAnalyticsEventCounts,
  useParentFunnel,
} from "@/hooks/useAdminDashboard";
import { AnalyticsEvents } from "@/lib/analytics/events";
import { useStaffRoute } from "@/hooks/useStaffRoute";
import { ActivityIndicator } from "react-native";

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const { isReady, isAdmin } = useStaffRoute();
  
  const funnel = useParentFunnel();
  const eventCounts = useAnalyticsEventCounts();

  if (!isReady || !isAdmin) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#534AB7" />
      </View>
    );
  }

  const isLoading = funnel.isLoading || eventCounts.isLoading;
  const isError = funnel.isError || eventCounts.isError;
  const isRefetching = funnel.isRefetching || eventCounts.isRefetching;

  const handleRefresh = () => {
    void funnel.refetch();
    void eventCounts.refetch();
  };

  return (
    <ScrollView
      className="flex-1 px-6 py-6"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
      }
    >
      <Text className="text-2xl font-bold text-ink mb-2 font-rubik text-right">
        אנליטיקה ומשפכים (Analytics)
      </Text>
      <Text className="text-sm text-ink-2 mb-6 text-right">
        מעקב אחר המרות (Conversions) ומעורבות משתמשים (Engagement) במערכת.
      </Text>

      {isLoading || isError ? (
        <StaffQueryFeedback
          isLoading={isLoading}
          isError={isError}
          error={funnel.error || eventCounts.error}
          onRetry={handleRefresh}
        />
      ) : (
        <>
          {funnel.data ? (
            <View className="mt-2 bg-purple-bg border border-purple rounded-card p-5">
              <Text className="text-lg font-bold text-purple-ink mb-2 font-rubik text-right">
                {t("staff.funnelTitle")} (משפך מרכזי)
              </Text>
              <FunnelChart
                bars={[
                  {
                    label: t("staff.funnelBar.activated"),
                    value: funnel.data.parentsActivated,
                  },
                  {
                    label: t("staff.funnelBar.viewed"),
                    value: funnel.data.parentsViewedMatches,
                  },
                  {
                    label: t("staff.funnelBar.requested"),
                    value: funnel.data.parentsSentRequest,
                  },
                  {
                    label: t("staff.funnelBar.matched"),
                    value: funnel.data.parentsWithMatch,
                  },
                ]}
              />
              <Text className="text-base font-semibold text-teal text-right mt-4">
                {t("staff.funnelConversion", {
                  toRequest: funnel.data.conversionToRequestPct,
                  toMatch: funnel.data.conversionToMatchPct,
                })}
              </Text>
            </View>
          ) : null}

          {eventCounts.data && Object.keys(eventCounts.data).length > 0 ? (
            <View className="mt-6 bg-surface border border-border rounded-card p-5">
              <Text className="text-lg font-bold text-ink mb-4 font-rubik text-right">
                מעורבות בימים האחרונים (Engagement Events)
              </Text>
              <FunnelChart
                bars={[
                  AnalyticsEvents.MATCHES_VIEWED,
                  AnalyticsEvents.REQUEST_SENT,
                  AnalyticsEvents.MATCH_CREATED,
                  AnalyticsEvents.CHECKIN_DONE,
                  AnalyticsEvents.DAILY_LOG_SUBMITTED,
                  AnalyticsEvents.REVIEW_SUBMITTED,
                ]
                  .map((key) => ({
                    label: key,
                    value: eventCounts.data[key] ?? 0,
                  }))
                  .filter((b) => b.value > 0)}
                title={t("staff.analyticsRecent")}
              />
            </View>
          ) : null}
        </>
      )}

      <View className="h-10" />
    </ScrollView>
  );
}
