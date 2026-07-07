import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { StarRating } from "@/components/shared/StarRating";
import { PrimaryButton, ScreenShell, TextField } from "@/components/ui/Screen";
import { useSubmitReview } from "@/hooks/useReviews";
import { useAuthStore } from "@/stores/auth-store";

export default function ReviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
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

  async function handleSubmit() {
    if (!matchId) {
      Alert.alert(t("common.error"), t("activeMatch.noMatchSelected"));
      return;
    }

    const reviewerRole = profile?.role === "professional" ? "professional" : "parent";

    try {
      await submit.submitReview({
        matchId,
        reviewerRole,
        reliability,
        professionalism,
        child_fit: childFit,
        text: text.trim() || undefined,
      });
      Alert.alert(t("reviews.saved"), undefined, [
        { text: t("common.continue"), onPress: () => router.back() },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.tryAgain");
      Alert.alert(t("common.error"), message);
    }
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
