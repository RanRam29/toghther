import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { CheckinCard } from "@/components/active-match/CheckinCard";
import { DailyLogRow } from "@/components/active-match/InsightsCard";
import { EmptyState } from "@/components/motion/EmptyState";
import { NextActionCard } from "@/components/shared/NextActionCard";
import { ScreenShell } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { useActiveMatchForProfessional } from "@/hooks/useActiveMatch";
import { useCheckin } from "@/hooks/useCheckin";
import { useMatchCheckins, useTodayCheckin } from "@/hooks/useCheckins";
import { useGetDailyLogs } from "@/hooks/useDailyLogs";
import { useNextActionNavigation } from "@/hooks/useNextActions";
import { useMyProfessional } from "@/hooks/useProfessional";
import { useAuthStore } from "@/stores/auth-store";
import { errorMessage, showError } from "@/lib/feedback";
import { BrandSpinner } from "@/components/motion/BrandSpinner";
import { colors } from "@/lib/theme";


function formatTime(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit" }).format(new Date(iso));
  } catch {
    return "";
  }
}

function formatLogRowLabel(
  logDate: string,
  createdAt: string,
  locale: string,
  formatDateFn: (dateString: string, locale: string) => string,
) {
  return `${formatDateFn(logDate, locale)} · ${formatTime(createdAt, locale)}`;
}

function formatDate(dateString: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit" }).format(new Date(dateString));
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

  const todayIso = new Date().toISOString().split("T")[0];
  const todayLogs =
    logs.data?.filter((log) => log.log_date === todayIso) ?? [];

  const { primary, navigateToAction } = useNextActionNavigation({
    role: "professional",
    screen: "pro_today" });

  const hideCheckinCard =
    primary?.id === "pro_checkin" || primary?.id === "pro_checkout";
  const hideQuestionnairePromo =
    primary?.id === "pro_daily_log" || primary?.id === "pro_add_log";

  function handlePrimaryAction() {
    if (!primary) return;
    if (primary.id === "pro_checkin" || primary.id === "pro_checkout") {
      void handleCheckIn();
      return;
    }
    if (primary.id === "pro_daily_log" || primary.id === "pro_add_log") {
      router.push({
        pathname: "/(active-match)/daily-log-form",
        params: { matchId } });
      return;
    }
    navigateToAction(primary);
  }

  async function handleCheckIn() {
    try {
      if (isCheckoutMode && todayCheckin) {
        await checkin.checkOut(todayCheckin.id);
      } else {
        await checkin.checkIn();
      }
      weekCheckins.refetch();
    } catch (err) {
      showError(errorMessage(err, t("common.tryAgain")));
    }
  }

  if (isLoading) {
    return (
      <ScreenShell title={t("professional.todayTitle")} subtitle={t("professional.todaySubtitle")}>
        <BrandSpinner size="large" />
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
          <RefreshControl refreshing={isRefetching} onRefresh={refetch}
          tintColor={colors.purple}
          colors={[colors.purple]}
        />
        }
        showsVerticalScrollIndicator={false}
      >
        {primary ? (
          <NextActionCard action={primary} onPress={handlePrimaryAction} />
        ) : null}

        <View className="mb-4">
          <Button
            variant="outline-secondary"
            label={t("professional.viewChildDetails", "צפייה בתיק הילד")}
            onPress={() =>
              router.push({
                pathname: "/(professional)/child-details" as any,
                params: { childId: activeMatch.child?.id } })
            }
            className="rounded-full mb-2"
          />
          <View className="flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              label="יומן שבועי"
              onPress={() => router.push("/(professional)/calendar" as any)}
              className="flex-1 rounded-full"
            />
            <Button
              variant="outline"
              size="sm"
              label="דוח שעות"
              onPress={() => router.push("/(professional)/attendance" as any)}
              className="flex-1 rounded-full"
            />
          </View>
        </View>

        {isCheckoutMode && !hideCheckinCard ? (
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
        ) : !showQuestionnaire && !hideCheckinCard ? (
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
        ) : !hideQuestionnairePromo ? (
          <View className="bg-purple-bg border border-purple rounded-card p-5 mb-4">
            <Text className="text-lg font-bold text-purple-ink mb-2 font-rubik text-start">
              {t("professional.todayQuestionnaireTitle")}
            </Text>
            <Text className="text-sm text-ink-2 mb-4 text-start leading-5">
              {todayLogs.length > 0
                ? t("professional.todayQuestionnaireDone", { count: todayLogs.length })
                : t("professional.todayQuestionnaireDesc", { name: childName })}
            </Text>
            <Button
              label={
                todayLogs.length > 0
                  ? t("professional.todayQuestionnaireAddMore")
                  : t("professional.todayQuestionnaireCta")
              }
              onPress={() =>
                router.push({
                  pathname: "/(active-match)/daily-log-form",
                  params: { matchId } })
              }
              className="rounded-full"
            />
          </View>
        ) : null}

        {hasCheckedInToday && todayCheckin ? (
          <View className="bg-teal-bg border border-teal rounded-card px-4 py-3 mb-4">
            <Text className="text-teal-ink text-sm font-semibold text-start">
              {t("professional.todayCheckedIn", {
                time: formatTime(todayCheckin.created_at, i18n.language) })}
            </Text>
          </View>
        ) : null}

        <Text className="text-base font-bold text-ink mb-3 font-rubik text-start">
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
          <EmptyState
            title={t("professional.todayNoCheckins")}
            variant="compact"
            className="mb-4 items-start"
          />
        )}

        {logs.data && logs.data.length > 0 ? (
          <>
            <Text className="text-base font-bold text-ink mb-3 mt-2 font-rubik text-start">
              {t("activeMatch.todayLogsTitle")}
            </Text>
            {logs.data.slice(0, 5).map((log) => (
              <DailyLogRow
                key={log.id}
                dateLabel={formatLogRowLabel(
                  log.log_date,
                  log.created_at,
                  i18n.language,
                  formatDate,
                )}
                mood={log.mood}
                notes={log.notes}
                onPress={() =>
                  router.push({
                    pathname: "/(active-match)/daily-log-detail" as any,
                    params: { logId: log.id, matchId } })
                }
              />
            ))}
          </>
        ) : null}

        <Button
          variant="outline-secondary"
          label={t("activeMatch.bannerAction")}
          onPress={() =>
            router.push({
              pathname: "/(active-match)",
              params: { matchId } })
          }
          className="mt-4 mb-8"
        />
      </ScrollView>
    </ScreenShell>
  );
}
