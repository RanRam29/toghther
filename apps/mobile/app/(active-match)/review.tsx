import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { StarRating } from "@/components/shared/StarRating";
import { PrimaryButton, ScreenShell, TextField } from "@/components/ui/Screen";
import { useMatchReviewStatus, useSubmitReview } from "@/hooks/useReviews";
import { useAuthStore } from "@/stores/auth-store";

export default function ReviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const params = useLocalSearchParams<{
    matchId?: string;
    professionalId?: string;
  }>();

  const matchId = params.matchId ?? "";
  const professionalId = params.professionalId ?? "";

  const [reliability, setReliability] = useState(5);
  const [professionalism, setProfessionalism] = useState(5);
  const [childFit, setChildFit] = useState(5);
  const [text, setText] = useState("");

  const submit = useSubmitReview(professionalId);
  const reviewStatus = useMatchReviewStatus(matchId, userId);

  async function handleSubmit() {
    if (!matchId) {
      Alert.alert(t("common.error"), t("activeMatch.noMatchSelected"));
      return;
    }

    try {
      await submit.submitReview({
        matchId,
        reliability,
        professionalism,
        child_fit: childFit,
        text: text.trim() || undefined,
      });
      Alert.alert(t("reviews.saved"), t("reviews.blindHidden"), [
        { text: t("common.continue"), onPress: () => router.back() },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.tryAgain");
      Alert.alert(t("common.error"), message);
    }
  }

  if (reviewStatus.data?.hasSubmitted) {
    return (
      <ScreenShell title={t("reviews.title")} subtitle={t("reviews.subtitle")}>
        <View className="bg-surface border border-border rounded-card p-5">
          <Text className="text-ink text-center leading-6">
            {reviewStatus.data.isBlind
              ? t("reviews.blindHidden")
              : t("reviews.alreadySubmitted")}
          </Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      eyebrow={t("reviews.eyebrow")}
      title={t("reviews.title")}
      subtitle={t("reviews.subtitle")}
    >
      <Pressable onPress={() => router.back()} className="mb-4 self-start">
        <Text className="text-purple font-medium font-rubik">{t("common.back")}</Text>
      </Pressable>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="bg-amber-bg border border-amber rounded-card p-4 mb-4">
          <Text className="text-sm text-ink-2 leading-5 text-right">
            {t("reviews.blindNotice")}
          </Text>
        </View>

        <StarRating
          label={t("reviews.reliability")}
          value={reliability}
          onChange={setReliability}
        />
        <StarRating
          label={t("reviews.professionalism")}
          value={professionalism}
          onChange={setProfessionalism}
        />
        <StarRating
          label={t("reviews.childFit")}
          value={childFit}
          onChange={setChildFit}
        />

        <TextField
          label={t("reviews.textLabel")}
          placeholder={t("reviews.textPlaceholder")}
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={5}
          className="min-h-[140px]"
          textAlignVertical="top"
        />

        <View className="pb-10 mt-2">
          <PrimaryButton
            label={t("reviews.submit")}
            onPress={handleSubmit}
            loading={submit.isPending}
          />
        </View>
      </ScrollView>
    </ScreenShell>
  );
}
