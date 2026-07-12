import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useStaffRoute } from "@/hooks/useStaffRoute";
import { useAdminChildren, useUnpublishChild } from "@/hooks/useAdminChildren";
import {
  filterStuckRequests,
  useAdminMatchRequests,
} from "@/hooks/useAdminRequests";
import { useAdminMfa } from "@/hooks/useAdminMfa";
import { daysSince } from "@/lib/api/admin-requests";
import { AdminMfaModal } from "@/components/admin/AdminMfaModal";
import { StaffQueryFeedback } from "@/components/admin/StaffQueryFeedback";
import type { AdminChildRow } from "@/lib/api/admin-children";

export default function AdminChildrenScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAdmin, isReady } = useStaffRoute();
  const mfa = useAdminMfa(isAdmin);
  const { data: children = [], isLoading, isError, error, refetch, isRefetching } =
    useAdminChildren();
  const {
    data: requests = [],
    isLoading: requestsLoading,
    isError: requestsError,
    error: requestsQueryError,
    refetch: refetchRequests,
  } = useAdminMatchRequests();
  const unpublish = useUnpublishChild();

  const [stuckOnly, setStuckOnly] = useState(false);
  const visibleRequests = filterStuckRequests(requests, stuckOnly);

  const [target, setTarget] = useState<AdminChildRow | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isReady && !isAdmin) {
      router.replace("/(staff)/verification" as never);
    }
  }, [isReady, isAdmin, router]);

  async function handleUnpublish() {
    if (!target || !reason.trim()) {
      Alert.alert(t("common.error"), t("staff.unpublishReasonRequired"));
      return;
    }
    try {
      await unpublish.mutateAsync({ childId: target.id, reason: reason.trim() });
      setTarget(null);
      setReason("");
      Alert.alert(t("staff.unpublishSuccess"));
    } catch (err) {
      if (mfa.handleRpcError(err)) return;
      const msg = err instanceof Error ? err.message : t("common.tryAgain");
      Alert.alert(t("common.error"), msg);
    }
  }

  if (!isReady || !isAdmin) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#534AB7" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        className="flex-1 px-6 py-6"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch();
            void refetchRequests();
          }}
        />
      }
      >
        <Text className="text-2xl font-bold text-ink mb-2 font-rubik text-right">
          {t("staff.childrenTitle")}
        </Text>
        <Text className="text-sm text-ink-2 mb-6 text-right">
          {t("staff.childrenSubtitle")}
        </Text>

        <StaffQueryFeedback
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={!isLoading && !isError && children.length === 0}
          emptyMessage={t("staff.childrenEmpty")}
          onRetry={() => void refetch()}
        />

        {!isLoading && !isError
          ? children.map((child) => (
            <View
              key={child.id}
              className="bg-surface border border-border rounded-card p-4 mb-3"
            >
              <View className="flex-row justify-between items-start mb-2">
                <Text
                  className={`text-xs font-semibold ${
                    child.published ? "text-teal" : "text-ink-2"
                  }`}
                >
                  {child.published ? t("staff.childPublished") : t("staff.childHidden")}
                </Text>
                <Text className="text-base font-bold text-ink font-rubik">
                  {child.first_name}, {child.age}
                </Text>
              </View>
              <Text className="text-sm text-ink-2 text-right mb-3">
                {t(`enums.needCategory.${child.category}`)} · {child.framework} · L
                {child.functioning_level}
              </Text>
              {child.published ? (
                <Pressable
                  onPress={() => {
                    setTarget(child);
                    setReason("");
                  }}
                  className="self-end rounded-card border border-amber px-4 py-2 active:opacity-90"
                >
                  <Text className="text-amber font-semibold text-sm font-rubik">
                    {t("staff.unpublishAction")}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ))
          : null}
        <View className="h-8" />

        <Text className="text-xl font-bold text-ink mb-2 font-rubik text-right">
          {t("staff.requestsTitle")}
        </Text>
        <Text className="text-sm text-ink-2 mb-4 text-right">
          {t("staff.requestsSubtitle")}
        </Text>

        <Pressable
          onPress={() => setStuckOnly((v) => !v)}
          className={`self-end px-4 py-2 rounded-full border mb-4 ${
            stuckOnly ? "bg-amber border-amber" : "bg-surface border-border"
          }`}
        >
          <Text
            className={`text-sm font-semibold font-rubik ${
              stuckOnly ? "text-white" : "text-ink-2"
            }`}
          >
            {t("staff.stuckOnly")} {stuckOnly ? "✓" : ""}
          </Text>
        </Pressable>

        <StaffQueryFeedback
          isLoading={requestsLoading}
          isError={requestsError}
          error={requestsQueryError}
          isEmpty={
            !requestsLoading && !requestsError && visibleRequests.length === 0
          }
          emptyMessage={t("staff.requestsEmpty")}
          onRetry={() => void refetchRequests()}
        />

        {!requestsLoading && !requestsError
          ? visibleRequests.map((req) => (
            <View
              key={req.id}
              className="bg-surface border border-border rounded-card p-4 mb-3"
            >
              <View className="flex-row justify-between mb-1">
                <Text className="text-xs text-ink-2">
                  {daysSince(req.created_at)} {t("staff.daysAgo")}
                </Text>
                <Text className="text-sm font-bold text-ink font-rubik">
                  {req.child?.first_name ?? "—"} →{" "}
                  {req.professional?.display_name ?? "—"}
                </Text>
              </View>
              <Text className="text-sm text-purple text-right">
                {req.status} · {req.initiated_by}
              </Text>
            </View>
          ))
          : null}
        <View className="h-8" />
      </ScrollView>

      <Modal visible={Boolean(target)} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-surface rounded-card p-6 w-full max-w-md">
            <Text className="text-lg font-bold text-ink mb-2 font-rubik text-right">
              {t("staff.unpublishTitle")}
            </Text>
            <Text className="text-sm text-ink-2 mb-4 text-right">
              {target?.first_name}
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={t("staff.unpublishReason")}
              placeholderTextColor="#918D84"
              multiline
              className="bg-bg border border-border rounded-card px-4 py-3 text-ink text-right min-h-[100px] mb-4"
            />
            <View className="flex-row gap-3 justify-end">
              <Pressable
                onPress={() => setTarget(null)}
                className="px-4 py-3"
              >
                <Text className="text-ink-2 font-rubik">{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={handleUnpublish}
                disabled={unpublish.isPending}
                className="bg-amber rounded-card px-6 py-3 active:opacity-90"
              >
                <Text className="text-white font-semibold font-rubik">
                  {t("staff.unpublishAction")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <AdminMfaModal
        visible={mfa.showModal}
        onClose={() => mfa.setShowModal(false)}
        onVerified={mfa.onVerified}
      />
    </>
  );
}
