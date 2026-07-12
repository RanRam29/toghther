import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { MetricStepper } from "@/components/active-match/MetricStepper";
import { MoodPicker } from "@/components/active-match/MoodPicker";
import { PrimaryButton, ScreenShell, TextField } from "@/components/ui/Screen";
import { useSubmitDailyLog } from "@/hooks/useDailyLogs";
import { useMatchMetricKeys, useMetricsForChild } from "@/hooks/useMetrics";

function retroDateOptions(): { label: string; value: string }[] {
  const options: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 3; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const value = d.toISOString().split("T")[0];
    const label =
      i === 0
        ? "היום"
        : new Intl.DateTimeFormat("he", { weekday: "short", day: "numeric", month: "short" }).format(d);
    options.push({ label, value });
  }
  return options;
}

export default function DailyLogFormScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ matchId?: string }>();
  const matchId = params.matchId ?? "";

  const submit = useSubmitDailyLog(matchId);
  const matchMetrics = useMatchMetricKeys(matchId);
  const catalog = useMetricsForChild(matchMetrics.data?.childId);

  const [mood, setMood] = useState(3);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [startedAt] = useState(Date.now());

  const metricKeys = useMemo(() => {
    const keys = matchMetrics.data?.metricKeys ?? [];
    if (keys.length > 0) return keys;
    return (catalog.data ?? []).slice(0, 3).map((m) => m.key);
  }, [matchMetrics.data?.metricKeys, catalog.data]);

  const metricLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of catalog.data ?? []) {
      map[item.key] = i18n.language === "he" ? item.he_label : item.en_label;
    }
    return map;
  }, [catalog.data, i18n.language]);

  useEffect(() => {
    if (metricKeys.length === 0) return;
    setMetrics((prev) => {
      const next = { ...prev };
      for (const key of metricKeys) {
        if (next[key] === undefined) next[key] = 3;
      }
      return next;
    });
  }, [metricKeys]);

  function updateMetric(key: string, value: number) {
    setMetrics((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!matchId) {
      Alert.alert(t("common.error"), t("activeMatch.noMatchSelected"));
      return;
    }

    const secondsToComplete = Math.round((Date.now() - startedAt) / 1000);

    try {
      await submit.submitLog({
        mood,
        metrics,
        notes: notes.trim(),
        log_date: logDate,
        seconds_to_complete: secondsToComplete,
      });
      Alert.alert(t("activeMatch.logSaved"), undefined, [
        { text: t("common.continue"), onPress: () => router.back() },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.tryAgain");
      Alert.alert(t("common.error"), message);
    }
  }

  const dateOptions = retroDateOptions();

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
        <Text className="text-sm font-bold text-purple mb-2 font-rubik">
          {t("activeMatch.logDateLabel")}
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-4 justify-end">
          {dateOptions.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setLogDate(opt.value)}
              className={`rounded-full px-4 py-2 border ${
                logDate === opt.value
                  ? "bg-purple border-purple"
                  : "bg-surface border-border"
              }`}
            >
              <Text
                className={`text-sm font-semibold font-rubik ${
                  logDate === opt.value ? "text-white" : "text-ink"
                }`}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <MoodPicker
          label={t("activeMatch.moodLabel")}
          value={mood}
          onChange={setMood}
          renderLabel={(key) => t(key)}
        />

        <Text className="text-sm font-bold text-purple mb-3 mt-2 font-rubik">
          {t("activeMatch.metricsSection")}
        </Text>

        {metricKeys.map((key) => (
          <MetricStepper
            key={key}
            label={metricLabels[key] ?? key}
            description=""
            value={metrics[key] ?? 3}
            min={1}
            max={5}
            onChange={(value) => updateMetric(key, value)}
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
