import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { CheckinCard } from "@/components/active-match/CheckinCard";
import { DailyLogRow, InsightsCard } from "@/components/active-match/InsightsCard";
import { ProfileViewsCard } from "@/components/active-match/ProfileViewsCard";
import { TodayStatusCard } from "@/components/active-match/TodayStatusCard";
import { TrendChart } from "@/components/active-match/TrendChart";
import { ScreenShell } from "@/components/ui/Screen";
import { useActiveMatchForParent, useActiveMatchForProfessional, useEndMatch } from "@/hooks/useActiveMatch";
import { useCheckin } from "@/hooks/useCheckin";
import { useTodayCheckin } from "@/hooks/useCheckins";
import { useGetDailyLogs } from "@/hooks/useDailyLogs";
import { useMatchMetricKeys, useMetricsForChild } from "@/hooks/useMetrics";
import { useProfileViews } from "@/hooks/useProfileViews";
import { useMyProfessional } from "@/hooks/useProfessional";
import { AnalyticsEvents } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { useAuthStore } from "@/stores/auth-store";

function formatTime(date: Date, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
  }
}

function formatDate(dateString: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

export default function ActiveMatchScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const params = useLocalSearchParams<{ matchId?: string }>();
  const matchId = params.matchId ?? "";

  const isProfessional = profile?.role === "professional";

  const checkin = useCheckin(matchId);
  const { todayCheckin, refetch: refetchCheckins } = useTodayCheckin(matchId);
  const logs = useGetDailyLogs(matchId);
  const endMatch = useEndMatch();
  const matchMetrics = useMatchMetricKeys(matchId);
  const catalog = useMetricsForChild(matchMetrics.data?.childId);

  const parentActive = useActiveMatchForParent(
    !isProfessional ? userId : undefined,
  );
  const { data: myPro } = useMyProfessional(isProfessional ? userId : undefined);
  const proActive = useActiveMatchForProfessional(
    isProfessional ? myPro?.id : undefined,
  );
  const activeMatch = isProfessional ? proActive.data : parentActive.data;
  const professionalId = activeMatch?.professional?.id;
  const childId = activeMatch?.child?.id ?? matchMetrics.data?.childId;
  const profileViews = useProfileViews(!isProfessional ? childId : undefined);

  const latestLog = logs.data?.[0];
  const metricKeys = matchMetrics.data?.metricKeys ?? [];
  const metricLabels = Object.fromEntries(
    (catalog.data ?? []).map((m) => [
      m.key,
      i18n.language === "he" ? m.he_label : m.en_label,
    ]),
  );
  const aiContent = isProfessional ? latestLog?.ai_strategy : latestLog?.ai_summary;
  const aiEmptyLabel = latestLog && !aiContent
    ? t("activeMatch.aiPreparing")
    : t("activeMatch.aiEmpty");

  const trackedAi = useRef(false);
  const trackedTrend = useRef(false);

  useEffect(() => {
    if (!isProfessional && matchId && aiContent && !trackedAi.current) {
      trackedAi.current = true;
      void track(AnalyticsEvents.AI_SUMMARY_VIEWED, { match_id: matchId });
    }
  }, [isProfessional, matchId, aiContent]);

  useEffect(() => {
    if (
      !isProfessional &&
      matchId &&
      logs.data &&
      logs.data.length > 0 &&
      !trackedTrend.current
    ) {
      trackedTrend.current = true;
      void track(AnalyticsEvents.TREND_CHART_VIEWED, { match_id: matchId });
    }
  }, [isProfessional, matchId, logs.data]);

  async function handleCheckIn() {
    try {
      await checkin.checkIn();
      refetchCheckins();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.tryAgain");
      Alert.alert(t("common.error"), message);
    }
  }

  function handleEndMatch() {
    Alert.alert(
      t("activeMatch.endTitle"),
      t("activeMatch.endConfirm"),
      [
        { text: t("common.tryAgain"), style: "cancel" },
        {
          text: t("activeMatch.endAction"),
          style: "destructive",
          onPress: async () => {
            try {
              await endMatch.mutateAsync({ matchId });
              router.replace({
                pathname: "/(active-match)/review",
                params: {
                  matchId,
                  professionalId: professionalId ?? activeMatch?.professional_id ?? "",
                },
              });
            } catch (err) {
              const message =
                err instanceof Error ? err.message : t("common.tryAgain");
              Alert.alert(t("common.error"), message);
            }
          },
        },
      ],
    );
  }

  if (!matchId) {
    return (
      <ScreenShell
        title={t("activeMatch.title")}
        subtitle={t("activeMatch.subtitle")}
      >
        <View className="bg-surface border border-border rounded-card p-5">
          <Text className="text-ink-2 text-center leading-6">
            {t("activeMatch.noMatchSelected")}
          </Text>
        </View>
      </ScreenShell>
    );
  }

  const now = new Date();
  const timeLabel = formatTime(now, i18n.language);
  const proName = activeMatch?.professional?.display_name ?? "";
  const todayCheckinTime = todayCheckin
    ? formatTime(new Date(todayCheckin.created_at), i18n.language)
    : null;

  function handleRefresh() {
    logs.refetch();
    refetchCheckins();
    if (!isProfessional) profileViews.refetch();
  }

  return (
    <ScreenShell
      title={t("activeMatch.title")}
      subtitle={t("activeMatch.subtitle")}
    >
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={logs.isRefetching || profileViews.isRefetching}
            onRefresh={handleRefresh}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {!isProfessional ? (
          <TodayStatusCard
            message={
              todayCheckin?.is_valid === true
                ? t("activeMatch.arrivedToday", {
                    name: proName,
                    time: todayCheckinTime ?? "",
                  })
                : t("activeMatch.notArrivedToday", { name: proName })
            }
            hasCheckedIn={todayCheckin?.is_valid === true}
          />
        ) : null}

        {isProfessional ? (
          <CheckinCard
            title={t("activeMatch.checkinTitle")}
            description={t("activeMatch.checkinDescription")}
            actionLabel={t("activeMatch.checkinAction")}
            onCheckIn={handleCheckIn}
            isPending={checkin.isPending}
            result={checkin.checkinResult}
            error={checkin.error}
            timeLabel={timeLabel}
            successLabel={(time, distance) =>
              t("activeMatch.checkinSuccess", { time, distance })
            }
            outOfRangeLabel={(distance) =>
              t("activeMatch.checkinOutOfRange", { distance })
            }
            errorLabel={t("activeMatch.checkinError")}
          />
        ) : null}

        <InsightsCard
          title={
            isProfessional
              ? t("activeMatch.aiStrategyTitle")
              : t("activeMatch.aiSummaryTitle")
          }
          emptyLabel={aiEmptyLabel}
          content={aiContent}
          variant={isProfessional ? "teal" : "purple"}
        />

        {!isProfessional && logs.data && logs.data.length > 0 ? (
          <TrendChart
            title={t("activeMatch.trendTitle")}
            emptyLabel={t("activeMatch.trendEmpty")}
            insufficientLabel={t("activeMatch.trendInsufficient")}
            metricLabels={metricLabels}
            metricKeys={metricKeys}
            logs={logs.data}
          />
        ) : null}

        {!isProfessional ? (
          <ProfileViewsCard
            title={t("activeMatch.profileViewsTitle")}
            emptyLabel={t("activeMatch.profileViewsEmpty")}
            entries={profileViews.data ?? []}
            formatDate={(iso) => formatDate(iso, i18n.language)}
            anonymousLabel={t("reviews.anonymous")}
          />
        ) : null}

        <View className="flex-row items-center justify-between mt-2 mb-3">
          <Text className="text-base font-bold text-ink font-rubik">
            {t("activeMatch.logsTitle")}
          </Text>
          {isProfessional ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(active-match)/daily-log-form",
                  params: { matchId },
                })
              }
              className="rounded-full bg-purple px-4 py-2 active:opacity-90"
            >
              <Text className="text-white text-sm font-semibold font-rubik">
                + {t("activeMatch.newLog")}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {logs.isLoading ? (
          <ActivityIndicator size="large" color="#534AB7" className="mt-4" />
        ) : !logs.data || logs.data.length === 0 ? (
          <View className="bg-surface border border-border rounded-card p-5">
            <Text className="text-ink-2 text-center leading-6">
              {t("activeMatch.noLogs")}
            </Text>
          </View>
        ) : (
          logs.data.map((log) => (
            <DailyLogRow
              key={log.id}
              dateLabel={formatDate(log.log_date, i18n.language)}
              mood={log.mood}
              notes={log.notes}
              summary={!isProfessional ? log.ai_summary : log.ai_strategy}
              noReportLabel={t("activeMatch.noReportDay")}
            />
          ))
        )}

        {!isProfessional ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(parent)/match-permissions",
                params: {
                  matchId,
                  childId: childId ?? "",
                },
              } as never)
            }
            className="rounded-card border border-purple py-3 items-center mb-4 active:opacity-90"
          >
            <Text className="text-purple font-semibold text-sm font-rubik">
              {t("permissions.openAction")}
            </Text>
          </Pressable>
        ) : null}

        <View className="mt-8 mb-10">
          <Pressable
            onPress={handleEndMatch}
            disabled={endMatch.isPending}
            className="rounded-card border border-coral py-4 items-center active:opacity-90"
          >
            <Text className="text-coral font-semibold text-base font-rubik">
              {endMatch.isPending
                ? t("common.tryAgain")
                : t("activeMatch.endAction")}
            </Text>
          </Pressable>
          <Text className="text-xs text-ink-2 text-center mt-2 leading-5">
            {t("activeMatch.endHelp")}
          </Text>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}
