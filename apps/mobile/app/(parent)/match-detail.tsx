import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { ReviewsList, ReviewsSummary } from "@/components/shared/ReviewsList";
import { PrimaryButton, ScreenShell, TextField } from "@/components/ui/Screen";
import { useCreateMatchRequest } from "@/hooks/useMatchRequests";
import { AnalyticsEvents } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { promptPushPermission } from "@/components/shared/PushPermissionProvider";
import { useScreenshotProtection } from "@/hooks/useScreenshotProtection";
import { formatMatchReason } from "@/lib/format-match-reason";
import { useChildren } from "@/hooks/useChildren";
import { useAuthStore } from "@/stores/auth-store";

export default function MatchDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const parentId = session?.user?.id;

  const params = useLocalSearchParams<{
    professionalId: string;
    childId: string;
    displayName: string;
    bio: string;
    matchReason: string;
    score: string;
  }>();

  useScreenshotProtection(params.childId);

  const { children } = useChildren(parentId);
  const child = children.find((c) => c.id === params.childId);
  const isSecondary = child?.secondary_parent_id === parentId;
  const canApprove = (child?.secondary_parent_permissions as any)?.can_approve ?? false;
  const canManage = !isSecondary || canApprove;

  const [message, setMessage] = useState("");
  const createRequest = useCreateMatchRequest(parentId);

  useEffect(() => {
    if (params.professionalId) {
      void track(AnalyticsEvents.MATCH_PROFILE_VIEWED, {
        professional_id: params.professionalId,
      });
    }
  }, [params.professionalId]);

  async function handleSendRequest() {
    if (!params.childId || !params.professionalId) return;

    if (!message.trim()) {
      Alert.alert(t("common.error"), t("parent.requestMessageRequired"));
      return;
    }

    try {
      await createRequest.mutateAsync({
        child_id: params.childId,
        professional_id: params.professionalId,
        parent_message: message.trim(),
        score: params.score ? Number(params.score) : undefined,
        match_reason: params.matchReason,
      });

      if (parentId) {
        void promptPushPermission(parentId);
      }

      Alert.alert(t("parent.requestSent"), t("parent.requestSentDesc"), [
        {
          text: t("common.continue"),
          onPress: () => router.replace("/(parent)/(tabs)/requests"),
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("common.error");
      Alert.alert(t("common.error"), msg);
    }
  }

  return (
    <ScreenShell title={t("parent.matchProfile")} showBack>
      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        <View className="items-center mb-6">
          <Text className="text-2xl font-bold text-ink mb-2 font-rubik text-center">
            {params.displayName}
          </Text>
          <Text className="text-base text-ink-2 text-center leading-6">
            {params.bio}
          </Text>
        </View>

        {params.matchReason ? (
          <View className="bg-purple/10 p-4 rounded-xl mb-6">
            <Text className="text-purple font-semibold text-start leading-5">
              {formatMatchReason(params.matchReason, t)}
            </Text>
          </View>
        ) : null}

        {params.professionalId ? (
          <View className="mb-6">
            <Text className="text-lg font-bold text-ink mb-3 font-rubik text-start">
              {t("reviews.ratingTitle")}
            </Text>
            <View className="bg-surface p-4 rounded-xl border border-border mb-4">
              <ReviewsSummary professionalId={params.professionalId} />
            </View>
            <Text className="text-base font-bold text-ink mb-3 font-rubik text-start">
              {t("reviews.recentReviews")}
            </Text>
            <ReviewsList professionalId={params.professionalId} limit={3} />
          </View>
        ) : null}

        <Text className="text-sm text-ink-2 mb-6 leading-5">
          {t("parent.requestPrivacyNote")}
        </Text>

        <TextField
          label={t("parent.requestMessageLabel")}
          value={message}
          onChangeText={setMessage}
          placeholder={t("parent.requestMessagePlaceholder")}
          multiline
          numberOfLines={4}
          className="min-h-[120px]"
          textAlignVertical="top"
        />

        <View className="mb-8">
          <PrimaryButton
            label={t("parent.sendRequest")}
            onPress={handleSendRequest}
            loading={createRequest.isPending}
            disabled={!canManage}
          />
        </View>
      </ScrollView>
    </ScreenShell>
  );
}
