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
      const text = err instanceof Error ? err.message : t("common.tryAgain");
      Alert.alert(t("common.error"), text);
    }
  }

  return (
    <ScreenShell
      title={params.displayName ?? t("parent.matchDetail")}
      subtitle={params.matchReason}
    >
      <Pressable onPress={() => router.back()} className="mb-4 self-start">
        <Text className="text-purple font-medium font-rubik">{t("common.back")}</Text>
      </Pressable>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {params.bio ? (
          <Text className="text-base text-ink-2 leading-6 mb-4">{params.bio}</Text>
        ) : null}

        {params.professionalId ? (
          <ReviewsSummary professionalId={params.professionalId} />
        ) : null}

        {params.score ? (
          <View className="bg-purple-bg rounded-card p-4 mb-6">
            <Text className="text-purple-ink font-bold text-lg font-rubik">
              {t("parent.matchScore", { score: Math.round(Number(params.score)) })}
            </Text>
          </View>
        ) : null}

        {params.professionalId ? (
          <View className="mb-6">
            <Text className="text-sm font-bold text-purple mb-3 font-rubik">
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

        <View className="pb-10 mt-2">
          <PrimaryButton
            label={t("parent.sendRequest")}
            onPress={handleSendRequest}
            loading={createRequest.isPending}
          />
        </View>
      </ScrollView>
    </ScreenShell>
  );
}
