import { useLocalSearchParams, useRouter } from "expo-router";
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
import { ScreenShell } from "@/components/ui/Screen";
import { useCheckin } from "@/hooks/useCheckin";
import { useGetDailyLogs } from "@/hooks/useDailyLogs";
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
  const params = useLocalSearchParams<{ matchId?: string }>();
  const matchId = params.matchId ?? "";

  const isProfessional = profile?.role === "professional";

  const checkin = useCheckin(matchId);
  const logs = useGetDailyLogs(matchId);

  const latestLog = logs.data?.[0];

  async function handleCheckIn() {
    try {
      await checkin.checkIn();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.tryAgain");
      Alert.alert(t("common.error"), message);
    }
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

  return (
    <ScreenShell
      title={t("activeMatch.title")}
      subtitle={t("activeMatch.subtitle")}
    >
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => undefined} />
        }
        showsVerticalScrollIndicator={false}
      >
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
          emptyLabel={t("activeMatch.aiEmpty")}
          content={isProfessional ? latestLog?.ai_strategy : latestLog?.ai_summary}
          variant={isProfessional ? "teal" : "purple"}
        />

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
            />
          ))
        )}
        <View className="h-6" />
      </ScrollView>
    </ScreenShell>
  );
}
