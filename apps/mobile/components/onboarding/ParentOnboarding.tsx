import { useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, Text, View } from "react-native";

import { ChipSelect, SwitchRow } from "@/components/ui/ChipSelect";
import { PrimaryButton, ScreenShell, TextField } from "@/components/ui/Screen";
import {
  completeParentOnboarding,
  fetchProfile,
  updateBaseProfile,
} from "@/lib/auth-api";
import { AnalyticsEvents } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import {
  CITY_PRESETS,
  FRAMEWORK_TYPES,
  FUNCTIONING_LEVELS,
  NEED_CATEGORIES,
  type FrameworkType,
  type NeedCategory,
} from "@/lib/constants/child";
import { useAuthStore, useLocaleStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";

export function ParentOnboarding() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const setProfile = useAuthStore((s) => s.setProfile);
  const language = useLocaleStore((s) => s.language);
  const reset = useOnboardingStore((s) => s.reset);

  const [fullName, setFullName] = useState("");
  const [area, setArea] = useState("");
  const [cityId, setCityId] = useState(CITY_PRESETS[0].id);

  const [firstName, setFirstName] = useState("");
  const [age, setAge] = useState("");
  const [category, setCategory] = useState<NeedCategory>("autism");
  const [secondaryCategory, setSecondaryCategory] = useState<NeedCategory | null>(
    null
  );
  const [functioningLevel, setFunctioningLevel] = useState(2);
  const [framework, setFramework] = useState<FrameworkType>("regular_school");
  const [communicationVerbal, setCommunicationVerbal] = useState(true);
  const [loading, setLoading] = useState(false);

  function categoryOptions() {
    return NEED_CATEGORIES.map((value) => ({
      value,
      label: t(`enums.needCategory.${value}`),
    }));
  }

  async function handleFinish() {
    if (!session?.user) {
      router.replace("/(auth)/login");
      return;
    }

    const parsedAge = Number.parseInt(age, 10);
    if (!fullName.trim() || !area.trim()) {
      Alert.alert(t("common.error"), t("common.required"));
      return;
    }
    if (!firstName.trim() || !parsedAge || parsedAge < 1 || parsedAge > 21) {
      Alert.alert(t("common.error"), t("parent.childFormInvalid"));
      return;
    }

    setLoading(true);
    try {
      await updateBaseProfile(session.user.id, {
        fullName,
        area,
        role: "parent",
        language,
      });

      const city = CITY_PRESETS.find((c) => c.id === cityId) ?? CITY_PRESETS[0];
      const childId = await completeParentOnboarding(session.user.id, {
        firstName,
        age: parsedAge,
        category,
        secondaryCategory,
        functioningLevel,
        framework,
        communicationVerbal,
        needs: {},
        city: { lng: city.lng, lat: city.lat },
      });

      void track(AnalyticsEvents.CHILD_PROFILE_COMPLETED, {
        child_id: childId,
        category,
      });

      const profile = await fetchProfile(session.user.id);
      setProfile(profile);
      reset();
      router.replace("/(parent)/(tabs)");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.authFailed");
      Alert.alert(t("common.error"), message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenShell
      eyebrow={t("auth.parentOnboarding.eyebrow")}
      title={t("auth.parentOnboarding.title")}
      subtitle={t("auth.parentOnboarding.subtitle")}
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Text className="text-sm font-bold text-purple mb-3 font-rubik">
          {t("auth.parentOnboarding.parentSection")}
        </Text>

        <TextField
          label={t("auth.fullNameLabel")}
          placeholder={t("auth.fullNamePlaceholder")}
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
        />

        <TextField
          label={t("auth.areaLabel")}
          placeholder={t("auth.areaPlaceholder")}
          value={area}
          onChangeText={setArea}
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

        <Text className="text-sm font-bold text-purple mb-3 mt-4 font-rubik">
          {t("auth.parentOnboarding.childSection")}
        </Text>

        <TextField
          label={t("parent.childFirstName")}
          placeholder={t("parent.childFirstNamePlaceholder")}
          value={firstName}
          onChangeText={setFirstName}
        />

        <TextField
          label={t("parent.childAge")}
          placeholder="7"
          value={age}
          onChangeText={(text) => setAge(text.replace(/\D/g, "").slice(0, 2))}
          keyboardType="number-pad"
        />

        <ChipSelect
          label={t("parent.primaryCategory")}
          options={categoryOptions()}
          value={category}
          onChange={setCategory}
        />

        <ChipSelect
          label={t("parent.secondaryCategory")}
          options={[
            { value: "", label: t("parent.none") },
            ...categoryOptions(),
          ]}
          value={secondaryCategory ?? ""}
          onChange={(value) =>
            setSecondaryCategory(value ? (value as NeedCategory) : null)
          }
        />

        <ChipSelect
          label={t("parent.functioningLevel")}
          options={FUNCTIONING_LEVELS.map((level) => ({
            value: level,
            label: t(`parent.functioningLevel${level}`),
          }))}
          value={functioningLevel}
          onChange={setFunctioningLevel}
        />

        <ChipSelect
          label={t("parent.framework")}
          options={FRAMEWORK_TYPES.map((value) => ({
            value,
            label: t(`enums.frameworkType.${value}`),
          }))}
          value={framework}
          onChange={setFramework}
        />

        <SwitchRow
          label={t("parent.communicationVerbal")}
          description={t("parent.communicationVerbalDesc")}
          value={communicationVerbal}
          onChange={setCommunicationVerbal}
        />

        <View className="pb-10 mt-2">
          <PrimaryButton
            label={t("auth.finishOnboarding")}
            onPress={handleFinish}
            loading={loading}
            variant="purple"
          />
        </View>
      </ScrollView>
    </ScreenShell>
  );
}
