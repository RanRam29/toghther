import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  ScrollView,
  Text,
  View,
} from "react-native";

import { MultiChipSelect } from "@/components/ui/ChipSelect";
import { PrimaryButton, ScreenShell, TextField } from "@/components/ui/Screen";
import { Avatar } from "@/components/ui/Avatar";
import {
  FRAMEWORK_TYPES,
  NEED_CATEGORIES,
  type FrameworkType,
  type NeedCategory } from "@/lib/constants/child";
import {
  useMyProfessional,
  useUpdateMyProfessional } from "@/hooks/useProfessional";
import { useProfessionalPublicStats, useMyReportingConsistency } from "@/hooks/useProfessionalTools";
import { useAuthStore } from "@/stores/auth-store";
import { BrandSpinner } from "@/components/motion/BrandSpinner";

const VERIFICATION_COLORS: Record<string, string> = {
  verified: "text-teal",
  submitted: "text-amber",
  pending: "text-ink-2",
  rejected: "text-coral" };

export default function ProfessionalProfileScreen() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;

  const { data: professional, isLoading } = useMyProfessional(userId);
  const { data: stats } = useProfessionalPublicStats(professional?.id);
  const { data: reportingConsistency } = useMyReportingConsistency(professional?.id);
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
        experience_years: Number.parseInt(experienceYears, 10) || 0 });
      Alert.alert(t("professional.profileSaved"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.tryAgain");
      Alert.alert(t("common.error"), message);
    }
  }

  if (isLoading) {
    return (
      <ScreenShell title={t("professional.profile")}>
        <BrandSpinner size="large" />
      </ScreenShell>
    );
  }

  const verification = professional?.verified ?? "pending";

  return (
    <ScreenShell title={t("professional.profile")}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="items-center mb-6 mt-4">
          <Avatar size="xl" fallbackText={displayName} />
          <Text className="text-purple text-sm font-rubik mt-2 font-medium">שנה תמונה</Text>
        </View>

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

        {stats && (
          <View className="bg-teal-bg border border-teal rounded-card px-4 py-4 mb-5 flex-row justify-between">
            <View className="flex-1 items-center">
              <Text className="text-2xl font-bold text-teal font-rubik">{stats.months_active}</Text>
              <Text className="text-xs text-teal-ink text-center mt-1">חודשי פעילות</Text>
            </View>
            <View className="w-px bg-teal/20" />
            <View className="flex-1 items-center">
              <Text className="text-2xl font-bold text-teal font-rubik">{stats.completed_matches}</Text>
              <Text className="text-xs text-teal-ink text-center mt-1">ליוויים שהסתיימו</Text>
            </View>
            <View className="w-px bg-teal/20" />
            <View className="flex-1 items-center">
              <Text className="text-2xl font-bold text-teal font-rubik">{reportingConsistency}%</Text>
              <Text className="text-xs text-teal-ink text-center mt-1">עקביות דיווח</Text>
            </View>
          </View>
        )}

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
            label: t(`enums.needCategory.${value}`) }))}
          values={specialties}
          onChange={setSpecialties}
        />

        <MultiChipSelect
          label={t("auth.pro.frameworkTypes")}
          options={FRAMEWORK_TYPES.map((value) => ({
            value,
            label: t(`enums.frameworkType.${value}`) }))}
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
