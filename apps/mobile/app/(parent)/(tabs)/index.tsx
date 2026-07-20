import { useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ChildSelector, MatchCard } from "@/components/parent/MatchCard";
import { InterestedRequestCards } from "@/components/parent/LetterCard";
import { ApproveDisclosureSheet } from "@/components/parent/ApproveDisclosureSheet";
import { PendingInvitations } from "@/components/parent/PendingInvitations";
import { ActiveMatchBanner } from "@/components/shared/ActiveMatchBanner";
import { NextActionCard } from "@/components/shared/NextActionCard";
import { NextActionList } from "@/components/shared/NextActionList";
import { PlaceholderCard, ScreenShell } from "@/components/ui/Screen";
import { useActiveMatchForParent } from "@/hooks/useActiveMatch";
import { useChildMatches } from "@/hooks/useChildMatches";
import { useChildren } from "@/hooks/useChildren";
import {
  useApproveMatchRequest,
  useMatchRequests } from "@/hooks/useMatchRequests";
import { useNextActionNavigation } from "@/hooks/useNextActions";
import { colors } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";
import { useParentStore } from "@/stores/parent-store";
import { BrandSpinner } from "@/components/motion/BrandSpinner";


export default function ParentHomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const parentId = session?.user?.id;
  const setSelectedChildId = useParentStore((s) => s.setSelectedChildId);
  const selectedChildId = useParentStore((s) => s.selectedChildId);

  const {
    children,
    selectedChild,
    isLoading: childrenLoading,
    refetch: refetchChildren,
    isRefetching: childrenRefetching } = useChildren(parentId);

  const childIds = children.map((c) => c.id);
  const { data: requests = [], refetch: refetchRequests } = useMatchRequests(
    parentId,
    childIds,
  );
  const approveRequest = useApproveMatchRequest(parentId);
  const [pendingApproveId, setPendingApproveId] = useState<string | null>(null);
  const pendingRequest = requests.find((request) => request.id === pendingApproveId);
  const pendingProfessionalName =
    pendingRequest?.professional?.display_name ?? t("parent.professionalFallback");

  const interestedRequests = requests
    .filter((r) => r.status === "interested")
    .map((r) => {
      const child = children.find((c) => c.id === r.child_id);
      return {
        id: r.id,
        cover_letter: r.cover_letter,
        parent_message: r.parent_message,
        match_reason: r.match_reason,
        childName: child?.first_name ?? t("parent.childProfile"),
        professionalName:
          r.professional?.display_name ?? t("parent.professionalFallback") };
    })
    .filter(
      (r) =>
        r.cover_letter?.trim() ||
        r.parent_message?.trim() ||
        r.match_reason?.trim(),
    );

  const { data: activeMatch } = useActiveMatchForParent(parentId);
  const { primary, secondary, navigateToAction } = useNextActionNavigation({
    role: "parent",
    screen: "parent_home" });

  const hideMatchBanner = primary?.id === "parent_no_checkin";
  const hideInterestedCards = primary?.id === "parent_approve_request";

  const {
    data: matches = [],
    isLoading: matchesLoading,
    refetch: refetchMatches,
    isRefetching: matchesRefetching,
    error: matchesError } = useChildMatches(selectedChild?.id);
  // S-PAR-01: an unpublished child still sees matches — publish only affects
  // whether verified aides can browse/find the child (S-PRO-05).

  const isLoading = childrenLoading || matchesLoading;
  const isRefetching = childrenRefetching || matchesRefetching;

  const disclosureItems = [
    t("parent.disclosureFullName"),
    t("parent.disclosureDiagnosis"),
    t("parent.disclosureWhatWorks"),
    t("parent.disclosureContact"),
  ];

  async function confirmApprove() {
    if (!pendingApproveId) return;
    const approvedId = pendingApproveId;
    try {
      await approveRequest.mutateAsync(approvedId);
      setPendingApproveId(null);
      router.push({
        pathname: "/(parent)/intro-detail",
        params: { requestId: approvedId } });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.tryAgain");
      Alert.alert(t("common.error"), message);
    }
  }

  function handleRefresh() {
    refetchChildren();
    refetchMatches();
    refetchRequests();
  }

  const subtitle = selectedChild
    ? t("parent.homeSubtitleNamed", { name: selectedChild.first_name })
    : t("parent.homeSubtitle");

  return (
    <ScreenShell
      title={t("parent.homeTitle")}
      subtitle={subtitle}
      headerRight={
        <Pressable
          onPress={() => router.push("/settings")}
          className="p-2 -me-2 bg-surface rounded-full border border-border"
          accessibilityRole="button"
          accessibilityLabel={t("settings.title")}
        >
          <Ionicons name="settings-outline" size={24} color={colors.purple} />
        </Pressable>
      }
    >
      <ApproveDisclosureSheet
        visible={Boolean(pendingApproveId)}
        professionalName={pendingProfessionalName}
        title={t("parent.disclosureTitle")}
        items={disclosureItems}
        confirmLabel={t("parent.disclosureConfirm")}
        cancelLabel={t("common.cancel")}
        onConfirm={confirmApprove}
        onCancel={() => setPendingApproveId(null)}
        loading={approveRequest.isPending}
      />

      {primary ? (
        <NextActionCard
          action={primary}
          onPress={() => navigateToAction(primary)}
        />
      ) : null}

      <NextActionList
        actions={secondary}
        onPress={(action) => navigateToAction(action)}
      />

      {activeMatch && !hideMatchBanner ? (
        <ActiveMatchBanner
          title={t("activeMatch.bannerEyebrow")}
          subtitle={t("activeMatch.bannerSubtitle", {
            name: activeMatch.professional?.display_name ?? "" })}
          actionLabel={t("activeMatch.bannerAction")}
          onPress={() =>
            router.push({
              pathname: "/(active-match)",
              params: { matchId: activeMatch.id } })
          }
        />
      ) : null}

      {!hideInterestedCards ? (
        <InterestedRequestCards
          requests={interestedRequests}
          onApprove={setPendingApproveId}
        />
      ) : null}

      <PendingInvitations />

      {children.length > 1 ? (
        <ChildSelector
          children={children}
          selectedId={selectedChildId}
          onSelect={setSelectedChildId}
        />
      ) : null}

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh}
          tintColor={colors.purple}
          colors={[colors.purple]}
        />
        }
        showsVerticalScrollIndicator={false}
      >
        {selectedChild?.published ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(parent)/progress-report",
                params: { childId: selectedChild.id } } as never)
            }
            className="rounded-card border border-teal py-3 items-center mb-6 active:opacity-90 bg-teal-bg"
          >
            <Text className="text-teal font-bold text-base font-rubik">
              {t("report.title", "דוח התקדמות (PDF)")}
            </Text>
          </Pressable>
        ) : null}

        {selectedChild && !selectedChild.published ? (
          <Pressable
            onPress={() =>
              router.push("/(parent)/(tabs)/child-profile" as never)
            }
            className="rounded-card border border-amber bg-amber-bg p-4 mb-4 active:opacity-90"
          >
            <Text className="text-amber-ink font-bold font-rubik text-sm mb-1">
              {t("parent.publishNudgeTitle", "הפרופיל עדיין לא פורסם")}
            </Text>
            <Text className="text-amber-ink font-rubik text-xs leading-5">
              {t("parent.publishNudgeBody", {
                name: selectedChild.first_name,
                defaultValue:
                  "אתם רואים כאן התאמות. פרסמו את הפרופיל כדי שמשלבות מאומתות יוכלו למצוא את {{name}} גם ביוזמתן.",
              })}
            </Text>
          </Pressable>
        ) : null}

        {isLoading ? (
          <BrandSpinner size="large" />
        ) : children.length === 0 ? (
          <PlaceholderCard text={t("parent.noChildProfile")} />
        ) : matchesError ? (
          <PlaceholderCard text={t("parent.matchesError")} />
        ) : matches.length === 0 ? (
          <View className="bg-surface-2 border border-border rounded-card p-8 items-center mt-6">
            <View className="w-24 h-24 bg-surface rounded-full items-center justify-center mb-6">
              <Ionicons name="search" size={40} color="#534AB7" />
            </View>
            <Text className="text-xl font-bold text-ink mb-2 font-rubik text-center">
              עוד לא מצאנו התאמה
            </Text>
            <Text className="text-base text-ink-2 text-center leading-6 mb-8">
              אנחנו מחפשים עבורכם את המשלבת המושלמת. הפעלת התראות מבוססות אזור תעזור לנו לעדכן אותך כשמשלבת רלוונטית תצטרף.
            </Text>
            <Pressable
              onPress={() => router.push("/settings")}
              className="bg-purple rounded-full py-4 px-8 items-center active:opacity-90 w-full"
            >
              <Text className="text-white font-bold font-rubik">להפעלת התראות אזוריות</Text>
            </Pressable>
          </View>
        ) : (
          <View
            className={
              Platform.OS === "web" ? "flex-row flex-wrap gap-4 w-full" : "w-full"
            }
          >
            {matches.map((match, index) => (
              <View
                key={match.professional_id}
                className={Platform.OS === "web" ? "w-[calc(50%-8px)]" : "w-full"}
              >
                <MatchCard
                  index={index}
                  name={match.display_name}
                  bio={match.bio}
                  matchReason={match.match_reason}
                  score={match.score}
                  distanceKm={match.distance_km}
                  ratingAvg={match.rating_avg}
                  distanceLabel={t("parent.distanceKm", { km: match.distance_km })}
                  onPress={() =>
                    router.push({
                      pathname: "/(parent)/match-detail",
                      params: {
                        professionalId: match.professional_id,
                        childId: selectedChild!.id,
                        displayName: match.display_name,
                        bio: match.bio,
                        matchReason: match.match_reason,
                        score: String(match.score) } })
                  }
                />
              </View>
            ))}
          </View>
        )}
        <View className="h-6" />
      </ScrollView>
    </ScreenShell>
  );
}
