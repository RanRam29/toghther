import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
} from "react-native";

import { MultiChipSelect } from "@/components/ui/ChipSelect";
import { PrimaryButton, ScreenShell, TextField } from "@/components/ui/Screen";
import {
  FRAMEWORK_TYPES,
  NEED_CATEGORIES,
  type FrameworkType,
  type NeedCategory,
} from "@/lib/constants/child";
import {
  useMyProfessional,
  useUpdateMyProfessional,
} from "@/hooks/useProfessional";
import { useAuthStore } from "@/stores/auth-store";

const VERIFICATION_COLORS: Record<string, string> = {
  verified: "text-teal",
  submitted: "text-amber",
  pending: "text-ink-2",
  rejected: "text-coral",
};

export default function ProfessionalProfileScreen() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;

  const { data: professional, isLoading } = useMyProfessional(userId);
  const update = useUpdateMyProfessional(userId);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState<NeedCategory[]>([]);
  const [frameworkTypes, setFrameworkTypes] = useState<FrameworkType[]>([]);
  const [experienceYears, setExperienceYears] = useState("");

  useEffect(() => {
    if (!professional) return;
    setDisplayName(professional.display_name);
    setBio(professional.bio ?? "");
    setSpecialties(professional.specialties);
    setFrameworkTypes(professional.framework_types);
    setExperienceYears(
      professional.experience_years != null
        ? String(professional.experience_years)
        : "",
    );
  }, [professional]);

  async function handleSave() {
    if (!displayName.trim()) {
      Alert.alert(t("common.error"), t("common.required"));
      return;
    }

    try {
      await update.mutateAsync({
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        specialties,
        framework_types: frameworkTypes,
        experience_years: Number.parseInt(experienceYears, 10) || 0,
      });
      Alert.alert(t("professional.profileSaved"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.tryAgain");
      Alert.alert(t("common.error"), message);
    }
  }

  if (isLoading) {
    return (
      <ScreenShell title={t("professional.profile")}>
        <ActivityIndicator size="large" color="#0F6E56" className="mt-8" />
      </ScreenShell>
    );
  }

  const verification = professional?.verified ?? "pending";

  return (
    <ScreenShell title={t("professional.profile")}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="bg-surface-2 rounded-card px-4 py-3 mb-5 flex-row items-center justify-between">
          <Text className="text-sm text-ink-2">
            {t("professional.verificationStatus")}
          </Text>
          <Text
            className={`text-sm font-semibold ${
              VERIFICATION_COLORS[verification] ?? "text-ink-2"
            }`}
          >
            {t(`enums.verification.${verification}`)}
          </Text>
        </View>

        <TextField
          label={t("auth.displayNameLabel")}
          placeholder={t("auth.displayNamePlaceholder")}
          value={displayName}
          onChangeText={setDisplayName}
        />

        <MultiChipSelect
          label={t("auth.pro.specialties")}
          options={NEED_CATEGORIES.map((value) => ({
            value,
            label: t(`enums.needCategory.${value}`),
          }))}
          values={specialties}
          onChange={setSpecialties}
        />

        <MultiChipSelect
          label={t("auth.pro.frameworkTypes")}
          options={FRAMEWORK_TYPES.map((value) => ({
            value,
            label: t(`enums.frameworkType.${value}`),
          }))}
          values={frameworkTypes}
          onChange={setFrameworkTypes}
        />

        <TextField
          label={t("auth.pro.experienceYears")}
          placeholder="3"
          value={experienceYears}
          onChangeText={(text) =>
            setExperienceYears(text.replace(/\D/g, "").slice(0, 2))
          }
          keyboardType="number-pad"
        />

        <TextField
          label={t("auth.bioLabel")}
          placeholder={t("auth.bioPlaceholder")}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
          className="min-h-[120px]"
          textAlignVertical="top"
        />

        <View className="pb-10 mt-2">
          <PrimaryButton
            label={t("professional.saveProfile")}
            onPress={handleSave}
            loading={update.isPending}
            variant="teal"
          />
        </View>
      </ScrollView>
    </ScreenShell>
  );
}
