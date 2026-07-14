import { useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
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
import { PlaceholderCard, ScreenShell } from "@/components/ui/Screen";
import { useActiveMatchForParent } from "@/hooks/useActiveMatch";
import { useChildMatches } from "@/hooks/useChildMatches";
import { useChildren } from "@/hooks/useChildren";
import {
  useApproveMatchRequest,
  useMatchRequests,
} from "@/hooks/useMatchRequests";
import { colors } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";
import { useParentStore } from "@/stores/parent-store";

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
    isRefetching: childrenRefetching,
  } = useChildren(parentId);

  const childIds = children.map((c) => c.id);
  const { data: requests = [], refetch: refetchRequests } = useMatchRequests(
    parentId,
    childIds,
  );
  const approveRequest = useApproveMatchRequest(parentId);
  const [pendingApproveId, setPendingApproveId] = useState<string | null>(null);

  const disclosureChild = children.find(
    (c) => c.id === requests.find((r) => r.id === pendingApproveId)?.child_id,
  );

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
          r.professional?.display_name ?? t("parent.professionalFallback"),
      };
    })
    .filter(
      (r) =>
        r.cover_letter?.trim() ||
        r.parent_message?.trim() ||
        r.match_reason?.trim(),
    );

  const { data: activeMatch } = useActiveMatchForParent(parentId);

  const {
    data: matches = [],
    isLoading: matchesLoading,
    refetch: refetchMatches,
    isRefetching: matchesRefetching,
    error: matchesError,
  } = useChildMatches(selectedChild?.published ? selectedChild.id : undefined);

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
        params: { requestId: approvedId },
      });
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
        childName={disclosureChild?.first_name ?? ""}
        title={t("parent.disclosureTitle")}
        subtitle={t("parent.disclosureSubtitle")}
        items={disclosureItems}
        confirmLabel={t("parent.disclosureConfirm")}
        cancelLabel={t("common.cancel")}
        onConfirm={confirmApprove}
        onCancel={() => setPendingApproveId(null)}
        loading={approveRequest.isPending}
      />

      {activeMatch ? (
        <ActiveMatchBanner
          title={t("activeMatch.bannerEyebrow")}
          subtitle={t("activeMatch.bannerSubtitle", {
            name: activeMatch.professional?.display_name ?? "",
          })}
          actionLabel={t("activeMatch.bannerAction")}
          onPress={() =>
            router.push({
              pathname: "/(active-match)",
              params: { matchId: activeMatch.id },
            })
          }
        />
      ) : null}

      <InterestedRequestCards
        requests={interestedRequests}
        onApprove={setPendingApproveId}
      />

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
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.purple} className="mt-8" />
        ) : children.length === 0 ? (
          <PlaceholderCard text={t("parent.noChildProfile")} />
        ) : !selectedChild?.published ? (
          <PlaceholderCard text={t("parent.childNotPublished")} />
        ) : matchesError ? (
          <PlaceholderCard text={t("parent.matchesError")} />
        ) : matches.length === 0 ? (
          <PlaceholderCard text={t("parent.noMatches")} />
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
                        score: String(match.score),
                      },
                    })
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
