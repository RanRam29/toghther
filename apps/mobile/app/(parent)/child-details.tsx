import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";

import { PrimaryButton, ScreenShell, TextField } from "@/components/ui/Screen";
import {
  useChildDetails,
  useUpsertChildDetails,
} from "@/hooks/useChildDetails";
import { useChildren } from "@/hooks/useChildren";
import { useAuthStore } from "@/stores/auth-store";

export default function ChildDetailsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const parentId = session?.user?.id;
  const params = useLocalSearchParams<{ childId?: string }>();
  const { children, selectedChild } = useChildren(parentId);
  const childId =
    params.childId ?? selectedChild?.id ?? children[0]?.id ?? undefined;

  const { data: details, isLoading } = useChildDetails(childId);
  const upsert = useUpsertChildDetails(childId);

  const [diagnosisFull, setDiagnosisFull] = useState("");
  const [whatWorks, setWhatWorks] = useState("");
  const [whatTriggers, setWhatTriggers] = useState("");
  const [winDefinition, setWinDefinition] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!details) {
      setDiagnosisFull("");
      setWhatWorks("");
      setWhatTriggers("");
      setWinDefinition("");
      setNotes("");
      return;
    }
    setDiagnosisFull(details.diagnosis_full ?? "");
    setWhatWorks(details.what_works ?? "");
    setWhatTriggers(details.what_triggers ?? "");
    setWinDefinition(details.win_definition ?? "");
    setNotes(details.notes ?? "");
  }, [details]);

  async function handleSave() {
    if (!childId) {
      Alert.alert(t("common.error"), t("parent.noChildProfile"));
      return;
    }

    try {
      await upsert.mutateAsync({
        diagnosis_full: diagnosisFull.trim() || null,
        what_works: whatWorks.trim() || null,
        what_triggers: whatTriggers.trim() || null,
        win_definition: winDefinition.trim() || null,
        notes: notes.trim() || null,
      });
      Alert.alert(t("parent.detailsSaved"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.tryAgain");
      Alert.alert(t("common.error"), message);
    }
  }

  if (!childId) {
    return (
      <ScreenShell title={t("parent.detailsTitle")}>
        <View className="bg-surface border border-border rounded-card p-5">
          <Text className="text-ink-2 text-center leading-6">
            {t("parent.noChildProfile")}
          </Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      eyebrow={t("parent.detailsEyebrow")}
      title={t("parent.detailsTitle")}
      subtitle={t("parent.detailsSubtitle")}
    >
      <Pressable onPress={() => router.back()} className="mb-4 self-start">
        <Text className="text-purple font-medium font-rubik">{t("common.back")}</Text>
      </Pressable>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#534AB7" className="mt-8" />
        ) : (
          <>
            <View className="bg-purple-bg rounded-card px-4 py-3 mb-5">
              <Text className="text-purple-ink text-sm leading-5">
                {t("parent.detailsPrivacyNote")}
              </Text>
            </View>

            <TextField
              label={t("parent.diagnosisLabel")}
              placeholder={t("parent.diagnosisPlaceholder")}
              value={diagnosisFull}
              onChangeText={setDiagnosisFull}
              multiline
              numberOfLines={3}
              className="min-h-[100px]"
              textAlignVertical="top"
            />

            <TextField
              label={t("parent.whatWorksLabel")}
              placeholder={t("parent.whatWorksPlaceholder")}
              value={whatWorks}
              onChangeText={setWhatWorks}
              multiline
              numberOfLines={3}
              className="min-h-[100px]"
              textAlignVertical="top"
            />

            <TextField
              label={t("parent.whatTriggersLabel")}
              placeholder={t("parent.whatTriggersPlaceholder")}
              value={whatTriggers}
              onChangeText={setWhatTriggers}
              multiline
              numberOfLines={3}
              className="min-h-[100px]"
              textAlignVertical="top"
            />

            <TextField
              label={t("parent.winDefinitionLabel")}
              placeholder={t("parent.winDefinitionPlaceholder")}
              value={winDefinition}
              onChangeText={setWinDefinition}
              multiline
              numberOfLines={3}
              className="min-h-[100px]"
              textAlignVertical="top"
            />

            <TextField
              label={t("parent.notesLabel")}
              placeholder={t("parent.notesPlaceholder")}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              className="min-h-[100px]"
              textAlignVertical="top"
            />

            <View className="pb-10 mt-2">
              <PrimaryButton
                label={t("parent.saveDetails")}
                onPress={handleSave}
                loading={upsert.isPending}
              />
            </View>
          </>
        )}
      </ScrollView>
    </ScreenShell>
  );
}
