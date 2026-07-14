import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, Text, View, Switch } from "react-native";

import { ScreenShell } from "@/components/ui/Screen";
import {
  useChildDetailsPreview,
  useMatchById,
  useFieldVisibility,
  useSetFieldVisibility,
} from "@/hooks/useMatchPermissions";
import { useScreenshotProtection } from "@/hooks/useScreenshotProtection";
import { useAuthStore } from "@/stores/auth-store";

const HIDEABLE_FIELDS = [
  "diagnosis_full",
  "what_works",
  "what_triggers",
  "gender_preference",
  "parent_contact",
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

  useScreenshotProtection(childId);

  const matchQuery = useMatchById(matchId);
  const resolvedChildId = childId || matchQuery.data?.child?.id;
  const details = useChildDetailsPreview(resolvedChildId);
  const visibilityQuery = useFieldVisibility(resolvedChildId, matchQuery.data?.professional?.id);
  const setVisibility = useSetFieldVisibility();

  const match = matchQuery.data;
  const proName = match?.professional?.display_name ?? "";
  
  const hiddenFields = visibilityQuery.data ?? [];
  const isPaused = hiddenFields.length === HIDEABLE_FIELDS.length;

  async function handleToggle(key: string, visible: boolean) {
    if (!resolvedChildId || !match?.professional?.id) return;
    try {
      let newHidden = [...hiddenFields];
      if (visible) {
        newHidden = newHidden.filter((f) => f !== key);
      } else {
        if (!newHidden.includes(key)) newHidden.push(key);
      }
      await setVisibility.mutateAsync({
        childId: resolvedChildId,
        professionalId: match.professional.id,
        hiddenFields: newHidden,
      });
    } catch (err) {
      Alert.alert(
        t("common.error"),
        err instanceof Error ? err.message : t("common.tryAgain"),
      );
    }
  }

  async function handlePause() {
    if (!resolvedChildId || !match?.professional?.id) return;
    try {
      await setVisibility.mutateAsync({
        childId: resolvedChildId,
        professionalId: match.professional.id,
        hiddenFields: [...HIDEABLE_FIELDS],
      });
      Alert.alert(t("permissions.pauseDone"));
    } catch (err) {
      Alert.alert(
        t("common.error"),
        err instanceof Error ? err.message : t("common.tryAgain"),
      );
    }
  }

  async function handleResume() {
    if (!resolvedChildId || !match?.professional?.id) return;
    try {
      await setVisibility.mutateAsync({
        childId: resolvedChildId,
        professionalId: match.professional.id,
        hiddenFields: [],
      });
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
      showBack
      backFallbackHref="/(active-match)"
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="text-base font-bold text-ink mb-3 font-rubik text-start">
          {t("permissions.visibleTitle")}
        </Text>
        <View className="bg-surface border border-border rounded-card p-4 mb-6">
          {/* Full name is never hideable */}
          {details.data?.full_name ? (
            <View className="mb-3 border-b border-border/40 pb-3 flex-row justify-between items-center">
              <Text className="text-sm text-ink-2 font-medium">{t("permissions.alwaysVisible")}</Text>
              <View>
                <Text className="text-xs text-purple font-bold mb-1 text-start">
                  {t("permissions.fields.full_name")}
                </Text>
                <Text className="text-sm text-ink-2 text-start leading-5">{details.data.full_name}</Text>
              </View>
            </View>
          ) : null}

          {HIDEABLE_FIELDS.map((key) => {
            const isHidden = hiddenFields.includes(key);
            return (
              <View key={key} className="mb-3 border-b border-border/40 pb-3 flex-row justify-between items-center">
                <Switch
                  value={!isHidden}
                  onValueChange={(val) => handleToggle(key, val)}
                  trackColor={{ false: "#E2E8F0", true: "#534AB7" }}
                  thumbColor="#FFFFFF"
                />
                <View className="flex-1 ms-4">
                  <Text className="text-xs text-purple font-bold mb-1 text-start">
                    {t(`permissions.fields.${key}`)}
                  </Text>
                  <Text className="text-sm text-ink-2 text-start">
                    {isHidden ? t("permissions.hiddenState", { name: proName }) : t("permissions.visibleState", { name: proName })}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {isPaused ? (
          <Pressable
            onPress={handleResume}
            disabled={setVisibility.isPending}
            className="bg-teal rounded-full py-4 items-center mb-4 active:opacity-90"
          >
            <Text className="text-white font-bold font-rubik">
              {t("permissions.resumeAction")}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handlePause}
            disabled={setVisibility.isPending}
            className="rounded-full border border-amber py-4 items-center mb-4 active:opacity-90"
          >
            <Text className="text-amber font-bold font-rubik">
              {t("permissions.pauseAction")}
            </Text>
          </Pressable>
        )}

        <Text className="text-xs text-ink-2 text-center leading-5 px-4 mb-8">
          {t("permissions.pauseHelp")}
        </Text>
      </ScrollView>
    </ScreenShell>
  );
}
