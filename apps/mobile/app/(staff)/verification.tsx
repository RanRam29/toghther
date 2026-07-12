import { useState } from "react";
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

import { SlaBadge } from "@/components/admin/SlaBadge";
import { StaffQueryFeedback } from "@/components/admin/StaffQueryFeedback";
import { PrimaryButton } from "@/components/ui/Screen";
import { getSlaLevel } from "@/lib/admin-verification";
import type { VerificationQueueItem } from "@/lib/api/supervisor";
import { useStaffRoute } from "@/hooks/useStaffRoute";
import {
  useClaimProfessional,
  useMyAssignedQueue,
  useUnassignedQueue,
} from "@/hooks/useSupervisorQueue";

type Tab = "pool" | "mine";

export default function StaffVerificationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAdmin, isSupervisor, userId } = useStaffRoute();
  const [tab, setTab] = useState<Tab>(isSupervisor ? "pool" : "mine");

  const pool = useUnassignedQueue(isAdmin);
  const mine = useMyAssignedQueue(userId, isAdmin);
  const claim = useClaimProfessional();

  const active = tab === "pool" ? pool : mine;

  function openReview(item: VerificationQueueItem) {
    router.push(`/(staff)/review/${item.id}` as never);
  }

  function handleClaim(item: VerificationQueueItem) {
    claim.mutate(item.id, {
      onSuccess: () => openReview(item),
    });
  }

  return (
    <ScrollView
      className="flex-1 px-6 py-6"
      refreshControl={
        <RefreshControl
          refreshing={active.isRefetching}
          onRefresh={() => {
            void pool.refetch();
            void mine.refetch();
          }}
        />
      }
    >
      <Text className="text-2xl font-bold text-ink mb-4 font-rubik text-right">
        {t("staff.queueTitle")}
      </Text>

      <View className="flex-row mb-6 bg-surface rounded-card border border-border p-1">
        <Pressable
          onPress={() => setTab("pool")}
          className={`flex-1 py-3 rounded-card items-center ${
            tab === "pool" ? "bg-purple" : ""
          }`}
        >
          <Text
            className={`font-semibold font-rubik ${
              tab === "pool" ? "text-white" : "text-ink-2"
            }`}
          >
            {t("staff.tabPool", { count: pool.data?.length ?? 0 })}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("mine")}
          className={`flex-1 py-3 rounded-card items-center ${
            tab === "mine" ? "bg-purple" : ""
          }`}
        >
          <Text
            className={`font-semibold font-rubik ${
              tab === "mine" ? "text-white" : "text-ink-2"
            }`}
          >
            {t("staff.tabMine", { count: mine.data?.length ?? 0 })}
          </Text>
        </Pressable>
      </View>

      <StaffQueryFeedback
        isLoading={active.isLoading}
        isError={active.isError}
        error={active.error}
        isEmpty={
          !active.isLoading &&
          !active.isError &&
          (active.data?.length ?? 0) === 0
        }
        emptyMessage={
          tab === "pool" ? t("staff.poolEmpty") : t("staff.mineEmpty")
        }
        onRetry={() => {
          void pool.refetch();
          void mine.refetch();
        }}
      />

      {!active.isLoading && !active.isError && (active.data?.length ?? 0) > 0
        ? active.data?.map((item, index) => {
          const sla = getSlaLevel(item.updated_at);
          const isPool = tab === "pool";

          return (
            <View
              key={item.id}
              className="bg-surface border border-border rounded-card p-4 mb-3"
            >
              <Pressable
                onPress={() => !isPool && openReview(item)}
                disabled={isPool}
                className="active:opacity-90"
              >
                <View className="flex-row items-start justify-between mb-2">
                  <SlaBadge level={sla} submittedAt={item.updated_at} />
                  <Text className="text-xs text-ink-2 font-rubik">#{index + 1}</Text>
                </View>
                <Text className="text-lg font-bold text-ink text-right font-rubik mb-1">
                  {item.display_name}
                </Text>
                <Text className="text-sm text-ink-2 text-right mb-3">
                  {item.profile?.area ?? "—"} · {item.experience_years ?? 0}{" "}
                  {t("admin.yearsExp")}
                </Text>
              </Pressable>
              {isPool ? (
                isAdmin ? (
                  <PrimaryButton
                    label={t("staff.openReview")}
                    onPress={() => openReview(item)}
                    variant="purple"
                  />
                ) : (
                  <PrimaryButton
                    label={t("staff.claim")}
                    onPress={() => handleClaim(item)}
                    loading={claim.isPending}
                    variant="teal"
                  />
                )
              ) : (
                <PrimaryButton
                  label={t("staff.openReview")}
                  onPress={() => openReview(item)}
                  variant="purple"
                />
              )}
            </View>
          );
        })
        : null}
      <View className="h-8" />
    </ScrollView>
  );
}
