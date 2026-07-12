import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { ScreenShell } from "@/components/ui/Screen";
import {
  useChildDetailsPreview,
  useMatchById,
  usePauseMatch,
  useResumeMatch,
} from "@/hooks/useMatchPermissions";
import { useAuthStore } from "@/stores/auth-store";

const FIELD_KEYS = [
  "full_name",
  "diagnosis_full",
  "what_works",
  "what_triggers",
  "win_definition",
  "notes",
] as const;

export default function MatchPermissionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const params = useLocalSearchParams<{ matchId?: string; childId?: string }>();
  const matchId = params.matchId ?? "";
  const childId = params.childId ?? "";

  const matchQuery = useMatchById(matchId);
  const details = useChildDetailsPreview(
    childId || matchQuery.data?.child?.id,
  );
  const pause = usePauseMatch();
  const resume = useResumeMatch();

  const match = matchQuery.data;
  const isPaused = match?.status === "paused";
  const proName = match?.professional?.display_name ?? "";

  async function handlePause() {
    if (!matchId) return;
    Alert.alert(t("permissions.pauseTitle"), t("permissions.pauseConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("permissions.pauseAction"),
        onPress: async () => {
          try {
            await pause.mutateAsync(matchId);
            Alert.alert(t("permissions.pauseDone"));
          } catch (err) {
            Alert.alert(
              t("common.error"),
              err instanceof Error ? err.message : t("common.tryAgain"),
            );
          }
        },
      },
    ]);
  }

  async function handleResume() {
    if (!matchId) return;
    try {
      await resume.mutateAsync(matchId);
      Alert.alert(t("permissions.resumeDone"));
    } catch (err) {
      Alert.alert(
        t("common.error"),
        err instanceof Error ? err.message : t("common.tryAgain"),
      );
    }
  }

  return (
    <ScreenShell
      title={t("permissions.title")}
      subtitle={t("permissions.subtitle", { name: proName })}
    >
      <Pressable onPress={() => router.back()} className="mb-4 self-start">
        <Text className="text-purple font-medium font-rubik">{t("common.back")}</Text>
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="text-base font-bold text-ink mb-3 font-rubik text-right">
          {t("permissions.visibleTitle")}
        </Text>
        <View className="bg-surface border border-border rounded-card p-4 mb-6">
          {FIELD_KEYS.map((key) => {
            const value = details.data?.[key];
            if (!value) return null;
            return (
              <View key={key} className="mb-3 border-b border-border/40 pb-3">
                <Text className="text-xs text-purple font-bold mb-1 text-right">
                  {t(`permissions.fields.${key}`)}
                </Text>
                <Text className="text-sm text-ink-2 text-right leading-5">{value}</Text>
              </View>
            );
          })}
          {!details.data ? (
            <Text className="text-sm text-ink-2 text-right">{t("permissions.noDetails")}</Text>
          ) : null}
        </View>

        {isPaused ? (
          <Pressable
            onPress={handleResume}
            disabled={resume.isPending}
            className="bg-teal rounded-full py-4 items-center mb-4 active:opacity-90"
          >
            <Text className="text-white font-bold font-rubik">
              {t("permissions.resumeAction")}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handlePause}
            disabled={pause.isPending}
            className="rounded-full border border-amber py-4 items-center mb-4 active:opacity-90"
          >
            <Text className="text-amber font-bold font-rubik">
              {t("permissions.pauseAction")}
            </Text>
          </Pressable>
        )}

        <Text className="text-xs text-ink-2 text-center leading-5 px-4">
          {t("permissions.pauseHelp")}
        </Text>
      </ScrollView>
    </ScreenShell>
  );
}
