import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, Text, View } from "react-native";

import { ChipSelect, MultiChipSelect, SwitchRow } from "@/components/ui/ChipSelect";
import { PrimaryButton, OutlineButton, ScreenShell, TextField } from "@/components/ui/Screen";
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
import { useOnboardingStore, type ChildDraft } from "@/stores/onboarding-store";

const TOTAL_STEPS = 6;

const WEEK_DAYS = [
  { value: "sunday", label: "א׳" },
  { value: "monday", label: "ב׳" },
  { value: "tuesday", label: "ג׳" },
  { value: "wednesday", label: "ד׳" },
  { value: "thursday", label: "ה׳" },
  { value: "friday", label: "ו׳" },
];

export function ParentOnboarding() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const setProfile = useAuthStore((s) => s.setProfile);
  const language = useLocaleStore((s) => s.language);
  const reset = useOnboardingStore((s) => s.reset);
  const childDraft = useOnboardingStore((s) => s.childDraft);
  const saveChildDraft = useOnboardingStore((s) => s.saveChildDraft);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Parent base profile
  const [fullName, setFullName] = useState("");
  const [area, setArea] = useState("");
  const [cityId, setCityId] = useState(CITY_PRESETS[0].id);
  const [phone, setPhone] = useState("");
  // Child basics
  const [firstName, setFirstName] = useState("");
  const [age, setAge] = useState("");
  // Framework
  const [framework, setFramework] = useState<FrameworkType | "">("");
  // Support hours
  const [hoursDays, setHoursDays] = useState<string[]>([]);
  const [hoursStart, setHoursStart] = useState("");
  const [hoursEnd, setHoursEnd] = useState("");
  // Needs & diagnosis
  const [category, setCategory] = useState<NeedCategory | "">("");
  const [secondaryCategory, setSecondaryCategory] = useState<NeedCategory | "">("");
  const [functioningLevel, setFunctioningLevel] = useState(2);
  const [communicationVerbal, setCommunicationVerbal] = useState(true);
  const [diagnosisFull, setDiagnosisFull] = useState("");
  // Guided free-text (child_details)
  const [whatWorks, setWhatWorks] = useState("");
  const [whatTriggers, setWhatTriggers] = useState("");
  const [winDefinition, setWinDefinition] = useState("");
  // Publish (D6)
  const [published, setPublished] = useState(true);

  const needsPhone = !session?.user?.phone;
  const draftApplied = useRef(false);

  // Resume from a persisted draft once it hydrates from AsyncStorage — P-02 edge case.
  useEffect(() => {
    if (!childDraft || draftApplied.current) return;
    draftApplied.current = true;
    const d = childDraft;
    setStep(d.step);
    setFullName(d.fullName);
    setArea(d.area);
    setCityId(d.cityId || CITY_PRESETS[0].id);
    setPhone(d.phone);
    setFirstName(d.firstName);
    setAge(d.age);
    setFramework(d.framework);
    setHoursDays(d.hoursDays ?? []);
    setHoursStart(d.hoursStart);
    setHoursEnd(d.hoursEnd);
    setCategory(d.category);
    setSecondaryCategory(d.secondaryCategory);
    setFunctioningLevel(d.functioningLevel);
    setCommunicationVerbal(d.communicationVerbal);
    setDiagnosisFull(d.diagnosisFull);
    setWhatWorks(d.whatWorks);
    setWhatTriggers(d.whatTriggers);
    setWinDefinition(d.winDefinition);
  }, [childDraft]);

  function buildDraft(nextStep: number): ChildDraft {
    return {
      step: nextStep,
      fullName,
      area,
      cityId,
      phone,
      firstName,
      age,
      framework,
      hoursDays,
      hoursStart,
      hoursEnd,
      category,
      secondaryCategory,
      functioningLevel,
      communicationVerbal,
      diagnosisFull,
      whatWorks,
      whatTriggers,
      winDefinition,
    };
  }

  function categoryOptions() {
    return NEED_CATEGORIES.map((value) => ({
      value,
      label: t(`enums.needCategory.${value}`),
    }));
  }

  function validateStep(current: number): boolean {
    if (current === 1) {
      if (!fullName.trim() || !area.trim() || (needsPhone && !phone.trim())) {
        Alert.alert(t("common.error"), t("common.required"));
        return false;
      }
      const parsedAge = Number.parseInt(age, 10);
      if (!firstName.trim() || !parsedAge || parsedAge < 1 || parsedAge > 21) {
        Alert.alert(t("common.error"), t("parent.childFormInvalid"));
        return false;
      }
    }
    if (current === 2 && !framework) {
      Alert.alert(t("common.error"), t("common.required"));
      return false;
    }
    if (current === 3 && hoursDays.length > 0) {
      const s = Number.parseInt(hoursStart, 10);
      const e = Number.parseInt(hoursEnd, 10);
      if (!Number.isFinite(s) || !Number.isFinite(e) || s < 0 || e > 24 || s >= e) {
        Alert.alert(t("common.error"), t("parent.hoursInvalid", "טווח השעות אינו תקין"));
        return false;
      }
    }
    if (current === 4 && !category) {
      Alert.alert(t("common.error"), t("common.required"));
      return false;
    }
    return true;
  }

  function goToStep(nextStep: number) {
    saveChildDraft(buildDraft(nextStep));
    setStep(nextStep);
  }

  function handleNextStep() {
    if (!validateStep(step)) return;
    goToStep(Math.min(step + 1, TOTAL_STEPS));
  }

  function handlePrevStep() {
    goToStep(Math.max(step - 1, 1));
  }

  function buildHoursNeeded(): Record<string, [number, number]> | null {
    if (hoursDays.length === 0) return null;
    const s = Number.parseInt(hoursStart, 10);
    const e = Number.parseInt(hoursEnd, 10);
    if (!Number.isFinite(s) || !Number.isFinite(e) || s >= e) return null;
    const result: Record<string, [number, number]> = {};
    hoursDays.forEach((day) => {
      result[day] = [s, e];
    });
    return result;
  }

  async function handleFinish() {
    if (!session?.user) {
      router.replace("/(auth)/login");
      return;
    }
    if (!category) {
      setStep(4);
      Alert.alert(t("common.error"), t("common.required"));
      return;
    }

    setLoading(true);
    try {
      await updateBaseProfile(session.user.id, {
        fullName,
        area,
        role: "parent",
        language,
        phone: needsPhone ? phone : undefined,
      });

      const city = CITY_PRESETS.find((c) => c.id === cityId) ?? CITY_PRESETS[0];
      const parsedAge = Number.parseInt(age, 10);
      const childId = await completeParentOnboarding(session.user.id, {
        firstName,
        age: parsedAge,
        category,
        secondaryCategory: secondaryCategory || null,
        functioningLevel,
        framework: framework as FrameworkType,
        communicationVerbal,
        needs: {},
        hoursNeeded: buildHoursNeeded(),
        diagnosisFull,
        whatWorks,
        whatTriggers,
        winDefinition,
        published,
        city: { lng: city.lng, lat: city.lat },
      });

      void track(AnalyticsEvents.CHILD_PROFILE_COMPLETED, {
        child_id: childId,
        category,
      });

      const profile = await fetchProfile(session.user.id);
      setProfile(profile);
      reset(); // clears role/phone + persisted draft
      router.replace("/(parent)/(tabs)");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.authFailed");
      Alert.alert(t("common.error"), message);
    } finally {
      setLoading(false);
    }
  }

  const stepTitle =
    step === 1
      ? t("auth.parentOnboarding.title")
      : step === 2
        ? "מסגרת חינוכית"
        : step === 3
          ? "שעות ליווי נדרשות"
          : step === 4
            ? "צרכים ואבחנה"
            : step === 5
              ? "היכרות עם הילד"
              : "פרסום הפרופיל";

  return (
    <ScreenShell
      eyebrow={`${t("auth.parentOnboarding.eyebrow")} • שלב ${step} מתוך ${TOTAL_STEPS}`}
      title={stepTitle}
      subtitle={step === 1 ? t("auth.parentOnboarding.subtitle") : undefined}
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Progress bar — S-PAR-10 / P-02 */}
        <View className="flex-row gap-2 mb-6" accessibilityRole="progressbar">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <View
              key={s}
              className={`h-1.5 flex-1 rounded-full ${
                s <= step ? "bg-purple" : "bg-surface-2"
              }`}
            />
          ))}
        </View>

        {step === 1 && (
          <View>
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
          </View>
        )}

        {step === 2 && (
          <View>
            <ChipSelect
              label={t("parent.framework")}
              options={FRAMEWORK_TYPES.map((value) => ({
                value,
                label: t(`enums.frameworkType.${value}`),
              }))}
              value={framework}
              onChange={(value) => setFramework(value as FrameworkType)}
            />
          </View>
        )}

        {step === 3 && (
          <View>
            <Text className="font-rubik text-base text-ink-2 leading-6 mb-4">
              באילו ימים ובאילו שעות דרוש ליווי? נשתמש בזה כדי להתאים משלבות פנויות.
            </Text>
            <MultiChipSelect
              label="ימים"
              options={WEEK_DAYS}
              values={hoursDays}
              onChange={setHoursDays}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextField
                  label="משעה"
                  placeholder="8"
                  value={hoursStart}
                  onChangeText={(text) => setHoursStart(text.replace(/\D/g, "").slice(0, 2))}
                  keyboardType="number-pad"
                />
              </View>
              <View className="flex-1">
                <TextField
                  label="עד שעה"
                  placeholder="14"
                  value={hoursEnd}
                  onChangeText={(text) => setHoursEnd(text.replace(/\D/g, "").slice(0, 2))}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>
        )}

        {step === 4 && (
          <View>
            {/* Reassurance sentence before the sensitive step — P-02 / 06-COPY-TONE */}
            <View className="bg-purple-bg/40 rounded-[14px] p-4 mb-5">
              <Text className="font-rubik text-sm text-purple-ink leading-6">
                המידע הזה נשאר אצלך. משלבת תראה רק את מה שתאשר/י בשלבים מתקדמים — אחרי שתבחר/י להתקדם איתה.
              </Text>
            </View>

            <ChipSelect
              label={t("parent.primaryCategory")}
              options={categoryOptions()}
              value={category}
              onChange={(value) => setCategory(value as NeedCategory)}
            />

            <ChipSelect
              label={t("parent.secondaryCategory")}
              options={[{ value: "", label: t("parent.none") }, ...categoryOptions()]}
              value={secondaryCategory}
              onChange={(value) => setSecondaryCategory((value as NeedCategory) || "")}
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

            <SwitchRow
              label={t("parent.communicationVerbal")}
              description={t("parent.communicationVerbalDesc")}
              value={communicationVerbal}
              onChange={setCommunicationVerbal}
            />

            <TextField
              label={t("parent.diagnosisFull", "אבחנה מלאה (לא חובה)")}
              placeholder={t("parent.diagnosisFullPlaceholder", "אפשר לפרט כאן")}
              value={diagnosisFull}
              onChangeText={setDiagnosisFull}
              multiline
              numberOfLines={3}
              className="min-h-[90px]"
              textAlignVertical="top"
            />
          </View>
        )}

        {step === 5 && (
          <View>
            <Text className="font-rubik text-base text-ink-2 leading-6 mb-4">
              כמה משפטים שיעזרו למשלבת להכיר את {firstName || "הילד/ה"} מהר. לא חובה — אפשר להשלים אחר כך.
            </Text>
            <TextField
              label="מה עובד"
              placeholder="מה עוזר, מה מרגיע, מה אוהב/ת"
              value={whatWorks}
              onChangeText={setWhatWorks}
              multiline
              numberOfLines={3}
              className="min-h-[90px]"
              textAlignVertical="top"
            />
            <TextField
              label="מה מקשה"
              placeholder="מה מפעיל לרעה, ממה כדאי להימנע"
              value={whatTriggers}
              onChangeText={setWhatTriggers}
              multiline
              numberOfLines={3}
              className="min-h-[90px]"
              textAlignVertical="top"
            />
            <TextField
              label="מה הניצחון"
              placeholder="איך נראית הצלחה מבחינתך"
              value={winDefinition}
              onChangeText={setWinDefinition}
              multiline
              numberOfLines={3}
              className="min-h-[90px]"
              textAlignVertical="top"
            />
          </View>
        )}

        {step === 6 && (
          <View>
            <Text className="font-rubik text-base text-ink-2 leading-6 mb-5">
              כמעט סיימנו! אפשר לפרסם את הפרופיל של {firstName || "הילד/ה"} כדי שמשלבות מאומתות
              יוכלו למצוא אתכם. תמיד אפשר לשנות זאת אחר כך מפרופיל הילד.
            </Text>
            <SwitchRow
              label="לפרסם עכשיו"
              description="פרסום חושף פרופיל בסיסי בלבד למשלבות מאומתות. פרטי הילד הרגישים נשארים מוסתרים עד שתאשר/י."
              value={published}
              onChange={setPublished}
            />
          </View>
        )}

        <View className="pb-10 mt-6 flex-col gap-3">
          {step < TOTAL_STEPS ? (
            <PrimaryButton label="המשך" onPress={handleNextStep} variant="purple" />
          ) : (
            <PrimaryButton
              label={t("auth.finishOnboarding")}
              onPress={handleFinish}
              loading={loading}
              variant="purple"
            />
          )}
          {step > 1 && (
            <OutlineButton label="חזור" onPress={handlePrevStep} variant="neutral" />
          )}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}
