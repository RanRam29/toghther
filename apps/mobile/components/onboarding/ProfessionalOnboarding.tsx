import { useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, View } from "react-native";

import { ChipSelect, MultiChipSelect } from "@/components/ui/ChipSelect";
import { PrimaryButton, ScreenShell, TextField } from "@/components/ui/Screen";
import {
  completeProfessionalOnboarding,
  fetchProfile,
  updateBaseProfile,
} from "@/lib/auth-api";
import { AnalyticsEvents } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import {
  CITY_PRESETS,
  FRAMEWORK_TYPES,
  NEED_CATEGORIES,
  type FrameworkType,
  type NeedCategory,
} from "@/lib/constants/child";
import { useAuthStore, useLocaleStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";

export function ProfessionalOnboarding() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const setProfile = useAuthStore((s) => s.setProfile);
  const language = useLocaleStore((s) => s.language);
  const reset = useOnboardingStore((s) => s.reset);

  const [fullName, setFullName] = useState("");
  const [area, setArea] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState<NeedCategory[]>([]);
  const [frameworkTypes, setFrameworkTypes] = useState<FrameworkType[]>([]);
  const [experienceYears, setExperienceYears] = useState("");
  const [phone, setPhone] = useState("");
  const [cityId, setCityId] = useState(CITY_PRESETS[0].id);
  const [loading, setLoading] = useState(false);

  const needsPhone = !session?.user?.phone;

  function specialtyOptions() {
    return NEED_CATEGORIES.map((value) => ({
      value,
      label: t(`enums.needCategory.${value}`),
    }));
  }

  function frameworkOptions() {
    return FRAMEWORK_TYPES.map((value) => ({
      value,
      label: t(`enums.frameworkType.${value}`),
    }));
  }

  async function handleFinish() {
    if (!session?.user) {
      router.replace("/(auth)/login");
      return;
    }

    const parsedExp = Number.parseInt(experienceYears, 10);
    if (!fullName.trim() || !area.trim() || (needsPhone && !phone.trim())) {
      Alert.alert(t("common.error"), t("common.required"));
      return;
    }
    if (!displayName.trim() || !parsedExp || parsedExp < 0) {
      Alert.alert(t("common.error"), t("professional.formInvalid"));
      return;
    }

    setLoading(true);
    try {
      await updateBaseProfile(session.user.id, {
        fullName,
        area,
        role: "professional",
        language,
        phone: needsPhone ? phone : undefined,
      });

      const city = CITY_PRESETS.find((c) => c.id === cityId) ?? CITY_PRESETS[0];
      await completeProfessionalOnboarding(session.user.id, {
        displayName: displayName.trim() || fullName.trim(),
        bio,
        specialties,
        experienceYears: Number.parseInt(experienceYears, 10) || 0,
        frameworkTypes,
        city: { lng: city.lng, lat: city.lat },
      });

      void track(AnalyticsEvents.PRO_ONBOARDING_COMPLETED, {});

      const profile = await fetchProfile(session.user.id);
      setProfile(profile);
      reset();
      router.replace("/(professional)");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.authFailed");
      Alert.alert(t("common.error"), message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenShell
      eyebrow={t("auth.pro.eyebrow")}
      title={t("auth.pro.title")}
      subtitle={t("auth.pro.subtitle")}
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <TextField
            label={t("professional.fullNameLabel")}
            placeholder={t("professional.fullNamePlaceholder")}
            value={fullName}
            onChangeText={setFullName}
            autoComplete="name"
          />
          {needsPhone && (
            <TextField
              label={t("auth.phoneLabel")}
              placeholder={t("auth.phonePlaceholder")}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoComplete="tel"
            />
          )}
          <TextField
          label={t("auth.displayNameLabel")}
          placeholder={t("auth.displayNamePlaceholder")}
          value={displayName}
          onChangeText={setDisplayName}
        />

        <ChipSelect
          label={t("parent.city")}
          options={CITY_PRESETS.map((city) => ({
            value: city.id,
            label: t(city.labelKey),
          }))}
          value={cityId}
          onChange={setCityId}
        />

        <TextField
          label={t("auth.areaLabel")}
          placeholder={t("auth.areaPlaceholder")}
          value={area}
          onChangeText={setArea}
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
            label={t("auth.finishOnboarding")}
            onPress={handleFinish}
            loading={loading}
            variant="teal"
          />
        </View>
      </ScrollView>
    </ScreenShell>
  );
}
