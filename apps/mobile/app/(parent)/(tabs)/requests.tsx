import { useState } from "react";
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

import { ApproveDisclosureSheet } from "@/components/parent/ApproveDisclosureSheet";
import { InterestedRequestCards } from "@/components/parent/LetterCard";
import { PlaceholderCard, ScreenShell } from "@/components/ui/Screen";
import { useChildren } from "@/hooks/useChildren";
import {
  useApproveMatchRequest,
  useMatchRequests,
  useRejectMatchRequest,
} from "@/hooks/useMatchRequests";
import { useAuthStore } from "@/stores/auth-store";

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber",
  interested: "text-teal",
  approved: "text-teal",
  rejected: "text-coral",
  expired: "text-ink-2",
  withdrawn: "text-ink-2",
};

export default function ParentRequestsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const parentId = session?.user?.id;
  const { children } = useChildren(parentId);
  const childIds = children.map((c) => c.id);

  const {
    data: requests = [],
    isLoading,
    refetch,
    isRefetching,
  } = useMatchRequests(parentId, childIds);

  const approveRequest = useApproveMatchRequest(parentId);
  const rejectRequest = useRejectMatchRequest(parentId);

  const [pendingApproveId, setPendingApproveId] = useState<string | null>(null);
  const disclosureChild = children.find(
    (c) => c.id === requests.find((r) => r.id === pendingApproveId)?.child_id,
  );

  const disclosureItems = [
    t("parent.disclosureFullName"),
    t("parent.disclosureDiagnosis"),
    t("parent.disclosureWhatWorks"),
    t("parent.disclosureContact"),
  ];

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

  const interestedIds = new Set(interestedRequests.map((r) => r.id));
  const otherRequests = requests.filter((r) => !interestedIds.has(r.id));

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

  async function handleReject(requestId: string) {
    Alert.alert(t("parent.rejectTitle"), t("parent.rejectConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("parent.rejectAction"),
        style: "destructive",
        onPress: async () => {
          try {
            await rejectRequest.mutateAsync(requestId);
            Alert.alert(t("parent.requestRejected"));
          } catch (err) {
            const message = err instanceof Error ? err.message : t("common.tryAgain");
            Alert.alert(t("common.error"), message);
          }
        },
      },
    ]);
  }

  return (
    <ScreenShell title={t("parent.requests")} subtitle={t("parent.requestsSubtitle")}>
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

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#534AB7" className="mt-8" />
        ) : requests.length === 0 ? (
          <PlaceholderCard text={t("parent.noRequests")} />
        ) : (
          <>
            <InterestedRequestCards
              requests={interestedRequests}
              onApprove={setPendingApproveId}
            />

            {otherRequests.map((request) => {
              const child = children.find((c) => c.id === request.child_id);
              const statusColor = STATUS_COLORS[request.status] ?? "text-ink-2";
              const showActions =
                request.status === "pending" &&
                request.initiated_by === "professional";

              const isSecondary = child?.secondary_parent_id === parentId;
              const canApprove =
                (child?.secondary_parent_permissions as { can_approve?: boolean } | null)
                  ?.can_approve ?? false;
              const canManage = !isSecondary || canApprove;

              return (
                <View
                  key={request.id}
                  className="bg-surface border border-border rounded-card p-5 mb-4"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-base font-bold text-ink font-rubik text-start flex-1">
                      {child?.first_name ?? t("parent.childProfile")}
                    </Text>
                    <Text className={`text-sm font-semibold ${statusColor}`}>
                      {t(`enums.requestStatus.${request.status}`)}
                    </Text>
                  </View>
                  {request.parent_message ? (
                    <Text className="text-sm text-ink-2 leading-5 mb-2 text-start">
                      {request.parent_message}
                    </Text>
                  ) : null}
                  {request.match_reason ? (
                    <Text className="text-xs text-teal mb-3 text-start">
                      {request.match_reason}
                    </Text>
                  ) : null}

                  {showActions ? (
                    <View className="flex-row flex-wrap gap-2 mt-4 justify-start">
                      <Pressable
                        onPress={() => setPendingApproveId(request.id)}
                        disabled={
                          !canManage ||
                          approveRequest.isPending ||
                          rejectRequest.isPending
                        }
                        className={`${!canManage ? "opacity-50" : ""} bg-purple rounded-full px-5 py-2 items-center justify-center active:opacity-90`}
                      >
                        <Text className="text-white text-sm font-semibold font-rubik">
                          {t("parent.approveRequest")}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleReject(request.id)}
                        disabled={
                          !canManage ||
                          approveRequest.isPending ||
                          rejectRequest.isPending
                        }
                        className={`${!canManage ? "opacity-50" : ""} rounded-full border border-coral px-4 py-2 items-center justify-center active:opacity-90`}
                      >
                        <Text className="text-coral text-sm font-semibold font-rubik">
                          {t("parent.rejectRequest")}
                        </Text>
                      </Pressable>
                    </View>
                  ) : request.status === "approved" ? (
                    <View className="mt-4 items-start">
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: "/(parent)/intro-detail",
                            params: { requestId: request.id },
                          })
                        }
                        className="bg-teal rounded-full px-5 py-2 items-center justify-center active:opacity-90"
                      >
                        <Text className="text-white text-sm font-semibold font-rubik">
                          {t("parent.viewIntroDetails")}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </>
        )}
        <View className="h-6" />
      </ScrollView>
    </ScreenShell>
  );
}
