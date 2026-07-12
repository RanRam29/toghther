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
          requests.map((request) => {
            const child = children.find((c) => c.id === request.child_id);
            const statusColor = STATUS_COLORS[request.status] ?? "text-ink-2";
            const showActions =
              request.status === "interested" ||
              (request.status === "pending" && request.initiated_by === "professional");

            return (
              <View
                key={request.id}
                className="bg-surface border border-border rounded-card p-5 mb-4"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-base font-bold text-ink font-rubik">
                    {child?.first_name ?? t("parent.childProfile")}
                  </Text>
                  <Text className={`text-sm font-semibold ${statusColor}`}>
                    {t(`enums.requestStatus.${request.status}`)}
                  </Text>
                </View>
                {request.parent_message ? (
                  <Text className="text-sm text-ink-2 leading-5 mb-2">
                    {request.parent_message}
                  </Text>
                ) : null}
                {request.match_reason ? (
                  <Text className="text-xs text-teal mb-3">{request.match_reason}</Text>
                ) : null}

                {showActions ? (
                  <View className="flex-row gap-2 mt-4">
                    <Pressable
                      onPress={() => setPendingApproveId(request.id)}
                      disabled={approveRequest.isPending || rejectRequest.isPending}
                      className="flex-1 bg-purple rounded-full py-2 items-center justify-center active:opacity-90"
                    >
                      <Text className="text-white text-sm font-semibold font-rubik">
                        {t("parent.approveRequest")}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleReject(request.id)}
                      disabled={approveRequest.isPending || rejectRequest.isPending}
                      className="rounded-full border border-coral px-4 py-2 items-center justify-center active:opacity-90"
                    >
                      <Text className="text-coral text-sm font-semibold font-rubik">
                        {t("parent.rejectRequest")}
                      </Text>
                    </Pressable>
                  </View>
                ) : request.status === "approved" ? (
                  <View className="mt-4">
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/(parent)/intro-detail",
                          params: { requestId: request.id },
                        })
                      }
                      className="bg-teal rounded-full py-2 items-center justify-center active:opacity-90"
                    >
                      <Text className="text-white text-sm font-semibold font-rubik">
                        {t("parent.viewIntroDetails")}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
        <View className="h-6" />
      </ScrollView>
    </ScreenShell>
  );
}
