import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { MetricStepper } from "@/components/active-match/MetricStepper";
import { MoodPicker } from "@/components/active-match/MoodPicker";
import { PrimaryButton, ScreenShell, TextField } from "@/components/ui/Screen";
import { useSubmitDailyLog } from "@/hooks/useDailyLogs";

interface MetricKey {
  key: "social_initiatives" | "regulation" | "participation";
  labelKey: string;
  descriptionKey: string;
}

const METRICS: MetricKey[] = [
  {
    key: "social_initiatives",
    labelKey: "activeMatch.metricSocial",
    descriptionKey: "activeMatch.metricSocialDesc",
  },
  {
    key: "regulation",
    labelKey: "activeMatch.metricRegulation",
    descriptionKey: "activeMatch.metricRegulationDesc",
  },
  {
    key: "participation",
    labelKey: "activeMatch.metricParticipation",
    descriptionKey: "activeMatch.metricParticipationDesc",
  },
];

export default function DailyLogFormScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ matchId?: string }>();
  const matchId = params.matchId ?? "";

  const submit = useSubmitDailyLog(matchId);

  const [mood, setMood] = useState(3);
  const [metrics, setMetrics] = useState<Record<string, number>>({
    social_initiatives: 3,
    regulation: 3,
    participation: 3,
  });
  const [notes, setNotes] = useState("");

  function updateMetric(key: string, value: number) {
    setMetrics((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!matchId) {
      Alert.alert(t("common.error"), t("activeMatch.noMatchSelected"));
      return;
    }

    try {
      await submit.submitLog({ mood, metrics, notes: notes.trim() });
      Alert.alert(t("activeMatch.logSaved"), undefined, [
        { text: t("common.continue"), onPress: () => router.back() },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.tryAgain");
      Alert.alert(t("common.error"), message);
    }
  }

  return (
    <ScreenShell
      eyebrow={t("activeMatch.logEyebrow")}
      title={t("activeMatch.logFormTitle")}
      subtitle={t("activeMatch.logFormSubtitle")}
    >
      <Pressable onPress={() => router.back()} className="mb-4 self-start">
        <Text className="text-purple font-medium font-rubik">{t("common.back")}</Text>
      </Pressable>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <MoodPicker
          label={t("activeMatch.moodLabel")}
          value={mood}
          onChange={setMood}
          renderLabel={(key) => t(key)}
        />

        <Text className="text-sm font-bold text-purple mb-3 mt-2 font-rubik">
          {t("activeMatch.metricsSection")}
        </Text>

        {METRICS.map((metric) => (
          <MetricStepper
            key={metric.key}
            label={t(metric.labelKey)}
            description={t(metric.descriptionKey)}
            value={metrics[metric.key] ?? 3}
            min={0}
            max={5}
            onChange={(value) => updateMetric(metric.key, value)}
          />
        ))}

        <TextField
          label={t("activeMatch.notesLabel")}
          placeholder={t("activeMatch.notesPlaceholder")}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={5}
          className="min-h-[140px]"
          textAlignVertical="top"
        />

        <View className="pb-10 mt-2">
          <PrimaryButton
            label={t("activeMatch.submitLog")}
            onPress={handleSubmit}
            loading={submit.isPending}
            variant="purple"
          />
        </View>
      </ScrollView>
    </ScreenShell>
  );
}
