import { useRouter } from "expo-router";
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
import { DailyLogRow } from "@/components/active-match/InsightsCard";
import { ScreenShell } from "@/components/ui/Screen";
import { useActiveMatchForProfessional } from "@/hooks/useActiveMatch";
import { useCheckin } from "@/hooks/useCheckin";
import { useMatchCheckins, useTodayCheckin } from "@/hooks/useCheckins";
import { useGetDailyLogs } from "@/hooks/useDailyLogs";
import { useMyProfessional } from "@/hooks/useProfessional";
import { useAuthStore } from "@/stores/auth-store";

function formatTime(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function formatDate(dateString: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

export default function ProfessionalTodayScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;

  const { data: professional } = useMyProfessional(userId);
  const { data: activeMatch, isLoading, refetch, isRefetching } =
    useActiveMatchForProfessional(professional?.id);

  const matchId = activeMatch?.id ?? "";
  const checkin = useCheckin(matchId);
  const { todayCheckin } = useTodayCheckin(matchId);
  const weekCheckins = useMatchCheckins(matchId);
  const logs = useGetDailyLogs(matchId);

  const hour = new Date().getHours();
  const isAfternoon = hour >= 14;
  const hasCheckedInToday = todayCheckin?.is_valid === true;
  const hasCheckedOutToday = hasCheckedInToday && todayCheckin?.checkout_at != null;
  const showQuestionnaire = isAfternoon || hasCheckedOutToday;
  const isCheckoutMode = hasCheckedInToday && !hasCheckedOutToday;

  const todayLog = logs.data?.find(
    (log) => log.log_date === new Date().toISOString().split("T")[0],
  );

  async function handleCheckIn() {
    try {
      if (isCheckoutMode && todayCheckin) {
        await checkin.checkOut(todayCheckin.id);
      } else {
        await checkin.checkIn();
      }
      weekCheckins.refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.tryAgain");
      Alert.alert(t("common.error"), message);
    }
  }

  if (isLoading) {
    return (
      <ScreenShell title={t("professional.todayTitle")} subtitle={t("professional.todaySubtitle")}>
        <ActivityIndicator size="large" color="#0F6E56" className="mt-8" />
      </ScreenShell>
    );
  }

  if (!activeMatch) {
    return (
      <ScreenShell title={t("professional.todayTitle")} subtitle={t("professional.todaySubtitle")}>
        <View className="bg-surface border border-border rounded-card p-5">
          <Text className="text-ink-2 text-center leading-6">
            {t("professional.todayNoMatch")}
          </Text>
        </View>
      </ScreenShell>
    );
  }

  const childName = activeMatch.child?.first_name ?? "";
  const nowLabel = formatTime(new Date().toISOString(), i18n.language);

  return (
    <ScreenShell
      title={t("professional.todayTitle")}
      subtitle={t("professional.todayWithChild", { name: childName })}
    >
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        showsVerticalScrollIndicator={false}
      >
        {isCheckoutMode ? (
          <CheckinCard
            title={t("professional.todayCheckoutTitle", "נוכחות סוף יום")}
            description={t("professional.todayCheckoutDesc", "סיימת להיום? דוחי על סיום עבודה.")}
            actionLabel={t("activeMatch.checkoutAction", "Check-out")}
            onCheckIn={handleCheckIn}
            isPending={checkin.isPending}
            result={checkin.checkinResult}
            error={checkin.error}
            timeLabel={nowLabel}
            successLabel={(time, distance) =>
              t("activeMatch.checkoutSuccess", { time, distance, defaultValue: "נרשמה יציאה בהצלחה!" })
            }
            outOfRangeLabel={(distance) =>
              t("activeMatch.checkoutOutOfRange", { distance, defaultValue: "נרשמה יציאה, אבל את מחוץ לטווח המסגרת." })
            }
            errorLabel={t("activeMatch.checkinError")}
          />
        ) : !showQuestionnaire ? (
          <CheckinCard
            title={t("professional.todayCheckinTitle")}
            description={t("professional.todayCheckinDesc")}
            actionLabel={t("activeMatch.checkinAction")}
            onCheckIn={handleCheckIn}
            isPending={checkin.isPending}
            result={checkin.checkinResult}
            error={checkin.error}
            timeLabel={nowLabel}
            successLabel={(time, distance) =>
              t("activeMatch.checkinSuccess", { time, distance })
            }
            outOfRangeLabel={(distance) =>
              t("activeMatch.checkinOutOfRange", { distance })
            }
            errorLabel={t("activeMatch.checkinError")}
          />
        ) : (
          <View className="bg-purple-bg border border-purple rounded-card p-5 mb-4">
            <Text className="text-lg font-bold text-purple-ink mb-2 font-rubik text-right">
              {t("professional.todayQuestionnaireTitle")}
            </Text>
            <Text className="text-sm text-ink-2 mb-4 text-right leading-5">
              {todayLog
                ? t("professional.todayQuestionnaireDone")
                : t("professional.todayQuestionnaireDesc", { name: childName })}
            </Text>
            {!todayLog ? (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(active-match)/daily-log-form",
                    params: { matchId },
                  })
                }
                className="bg-purple rounded-full py-4 items-center active:opacity-90"
              >
                <Text className="text-white font-bold text-base font-rubik">
                  {t("professional.todayQuestionnaireCta")}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {hasCheckedInToday && todayCheckin ? (
          <View className="bg-teal-bg border border-teal rounded-card px-4 py-3 mb-4">
            <Text className="text-teal-ink text-sm font-semibold text-right">
              {t("professional.todayCheckedIn", {
                time: formatTime(todayCheckin.created_at, i18n.language),
              })}
            </Text>
          </View>
        ) : null}

        <Text className="text-base font-bold text-ink mb-3 font-rubik text-right">
          {t("professional.todayWeekHistory")}
        </Text>

        {weekCheckins.data && weekCheckins.data.length > 0 ? (
          weekCheckins.data.slice(0, 7).map((entry) => (
            <View
              key={entry.id}
              className="flex-row items-center justify-between bg-surface border border-border rounded-card px-4 py-3 mb-2"
            >
              <Text className="text-xs text-ink-2">
                {formatDate(entry.created_at, i18n.language)}
              </Text>
              <Text
                className={`text-sm font-medium ${
                  entry.is_valid ? "text-teal" : "text-amber"
                }`}
              >
                {entry.is_valid
                  ? t("professional.todayCheckinValid")
                  : t("professional.todayCheckinInvalid")}
              </Text>
            </View>
          ))
        ) : (
          <Text className="text-sm text-ink-2 text-right mb-4">
            {t("professional.todayNoCheckins")}
          </Text>
        )}

        {logs.data && logs.data.length > 0
          ? logs.data.slice(0, 5).map((log) => (
              <DailyLogRow
                key={log.id}
                dateLabel={formatDate(log.log_date, i18n.language)}
                mood={log.mood}
                notes={log.notes}
              />
            ))
          : null}

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(active-match)",
              params: { matchId },
            })
          }
          className="mt-4 mb-8 rounded-card border border-teal py-4 items-center active:opacity-90"
        >
          <Text className="text-teal font-semibold text-base font-rubik">
            {t("activeMatch.bannerAction")}
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}
