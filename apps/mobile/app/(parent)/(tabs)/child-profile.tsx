import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { ChildSelector } from "@/components/parent/MatchCard";
import { ChipSelect, SwitchRow } from "@/components/ui/ChipSelect";
import { PrimaryButton, ScreenShell, TextField } from "@/components/ui/Screen";
import {
  CITY_PRESETS,
  FRAMEWORK_TYPES,
  FUNCTIONING_LEVELS,
  NEED_CATEGORIES,
  type FrameworkType,
  type NeedCategory,
} from "@/lib/constants/child";
import { toGeoPoint } from "@/lib/geo";
import {
  useChildren,
  useCreateChild,
  useUpdateChild,
} from "@/hooks/useChildren";
import { useAuthStore } from "@/stores/auth-store";
import { useParentStore } from "@/stores/parent-store";

const DEFAULT_CATEGORY: NeedCategory = "autism";
const DEFAULT_FRAMEWORK: FrameworkType = "regular_school";

export default function ChildProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const parentId = session?.user?.id;
  const selectedChildId = useParentStore((s) => s.selectedChildId);
  const setSelectedChildId = useParentStore((s) => s.setSelectedChildId);

  const { children, selectedChild } = useChildren(parentId);
  const createChild = useCreateChild(parentId);
  const updateChild = useUpdateChild(parentId);

  const [isNew, setIsNew] = useState(children.length === 0);
  const [firstName, setFirstName] = useState("");
  const [age, setAge] = useState("");
  const [category, setCategory] = useState<NeedCategory>(DEFAULT_CATEGORY);
  const [secondaryCategory, setSecondaryCategory] = useState<NeedCategory | null>(
    null,
  );
  const [functioningLevel, setFunctioningLevel] = useState<number>(2);
  const [framework, setFramework] = useState<FrameworkType>(DEFAULT_FRAMEWORK);
  const [cityId, setCityId] = useState(CITY_PRESETS[0].id);
  const [communicationVerbal, setCommunicationVerbal] = useState(true);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (children.length === 0) {
      setIsNew(true);
      return;
    }

    const child = selectedChild;
    if (!child) return;

    setIsNew(false);
    setFirstName(child.first_name);
    setAge(String(child.age));
    setCategory(child.category);
    setSecondaryCategory(child.secondary_category);
    setFunctioningLevel(child.functioning_level);
    setFramework(child.framework);
    setCommunicationVerbal(child.communication_verbal);
    setPublished(child.published);
  }, [children.length, selectedChild?.id, selectedChild]);

  function resetNewForm() {
    setIsNew(true);
    setFirstName("");
    setAge("");
    setCategory(DEFAULT_CATEGORY);
    setSecondaryCategory(null);
    setFunctioningLevel(2);
    setFramework(DEFAULT_FRAMEWORK);
    setCityId(CITY_PRESETS[0].id);
    setCommunicationVerbal(true);
    setPublished(false);
  }

  function categoryOptions(values: NeedCategory[]) {
    return values.map((value) => ({
      value,
      label: t(`enums.needCategory.${value}`),
    }));
  }

  async function handleSave() {
    if (!parentId) return;

    const parsedAge = Number.parseInt(age, 10);
    if (!firstName.trim() || !parsedAge || parsedAge < 1 || parsedAge > 21) {
      Alert.alert(t("common.error"), t("parent.childFormInvalid"));
      return;
    }

    const city = CITY_PRESETS.find((c) => c.id === cityId) ?? CITY_PRESETS[0];
    const payload = {
      first_name: firstName.trim(),
      age: parsedAge,
      category,
      secondary_category: secondaryCategory,
      functioning_level: functioningLevel,
      framework,
      communication_verbal: communicationVerbal,
      published,
      location: toGeoPoint(city.lng, city.lat),
      needs: {},
      parent_id: parentId,
    };

    try {
      if (isNew) {
        await createChild.mutateAsync(payload);
        setIsNew(false);
      } else if (selectedChild) {
        const { parent_id: _, ...updatePayload } = payload;
        await updateChild.mutateAsync({
          id: selectedChild.id,
          input: updatePayload,
        });
      }
      Alert.alert(t("parent.childSaved"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.tryAgain");
      Alert.alert(t("common.error"), message);
    }
  }

  const isSaving = createChild.isPending || updateChild.isPending;

  return (
    <ScreenShell title={t("parent.childProfile")}>
      {children.length > 0 ? (
        <ChildSelector
          children={children}
          selectedId={selectedChildId}
          onSelect={(id) => {
            setIsNew(false);
            setSelectedChildId(id);
          }}
          addLabel={t("parent.addChild")}
          onAdd={resetNewForm}
        />
      ) : null}

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {isNew ? (
          <Text className="text-sm text-purple font-medium mb-4">
            {t("parent.newChildForm")}
          </Text>
        ) : null}

        <TextField
          label={t("parent.childFirstName")}
          value={firstName}
          onChangeText={setFirstName}
          placeholder={t("parent.childFirstNamePlaceholder")}
        />

        <TextField
          label={t("parent.childAge")}
          value={age}
          onChangeText={(text) => setAge(text.replace(/\D/g, "").slice(0, 2))}
          keyboardType="number-pad"
          placeholder="7"
        />

        <ChipSelect
          label={t("parent.primaryCategory")}
          options={categoryOptions(NEED_CATEGORIES)}
          value={category}
          onChange={setCategory}
        />

        <ChipSelect
          label={t("parent.secondaryCategory")}
          options={[
            { value: "", label: t("parent.none") },
            ...categoryOptions(NEED_CATEGORIES),
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

        <ChipSelect
          label={t("parent.city")}
          options={CITY_PRESETS.map((city) => ({
            value: city.id,
            label: t(city.labelKey),
          }))}
          value={cityId}
          onChange={setCityId}
        />

        <SwitchRow
          label={t("parent.communicationVerbal")}
          description={t("parent.communicationVerbalDesc")}
          value={communicationVerbal}
          onChange={setCommunicationVerbal}
        />

        <SwitchRow
          label={t("parent.publishProfile")}
          description={t("parent.publishProfileDesc")}
          value={published}
          onChange={setPublished}
        />

        <View className="mt-2 mb-3">
          <PrimaryButton
            label={t("parent.saveChild")}
            onPress={handleSave}
            loading={isSaving}
          />
        </View>

        {!isNew && selectedChild ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(parent)/child-details",
                params: { childId: selectedChild.id },
              })
            }
            className="rounded-card py-4 px-6 items-center border border-purple bg-purple-bg active:opacity-90 mb-10"
          >
            <Text className="text-purple-ink text-base font-semibold font-rubik">
              {t("parent.openDetails")} →
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}
