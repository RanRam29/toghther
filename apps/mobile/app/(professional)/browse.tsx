import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  RefreshControl,
  ScrollView,
  View,
} from "react-native";

import { BrowseChildCard } from "@/components/professional/Cards";
import { PlaceholderCard, ScreenShell } from "@/components/ui/Screen";
import {
import { useExpressInterest, useMyProfessional, usePublishedChildren } from "@/hooks/useProfessional";
import { errorMessage, showError, showSuccess } from "@/lib/feedback";
import { useAuthStore } from "@/stores/auth-store";
import { BrandSpinner } from "@/components/motion/BrandSpinner";
import { colors } from "@/lib/theme";
import { ChipSelect } from "@/components/ui/ChipSelect";

export default function ProfessionalBrowseScreen() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;

  const { data: professional } = useMyProfessional(userId);
  const professionalId = professional?.id;
  const isVerified = professional?.verified === "verified";

  const {
    data: children = [],
    isLoading,
    refetch,
    isRefetching } = usePublishedChildren(Boolean(professionalId));

  const interest = useExpressInterest(professionalId);

  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterFramework, setFilterFramework] = useState<string | null>(null);
  const [filterCommunication, setFilterCommunication] = useState<string | null>(null);
  const [filterAge, setFilterAge] = useState<string | null>(null);

  const filteredChildren = children.filter((child) => {
    if (filterCategory && child.category !== filterCategory) return false;
    if (filterFramework && child.framework !== filterFramework) return false;
    if (filterCommunication === "verbal" && child.communication_verbal !== true) return false;
    if (filterCommunication === "non_verbal" && child.communication_verbal !== false) return false;
    
    if (filterAge === "0_3" && (child.age < 0 || child.age > 3)) return false;
    if (filterAge === "4_6" && (child.age < 4 || child.age > 6)) return false;
    if (filterAge === "7_12" && (child.age < 7 || child.age > 12)) return false;
    if (filterAge === "13_plus" && child.age < 13) return false;
    
    return true;
  });

  function handleInterest(childId: string) {
    interest.mutate(childId, {
      onSuccess: () => showSuccess({ title: t("professional.interestSent") }),
      onError: (err) => showError(errorMessage(err, t("common.tryAgain"))) });
  }

  return (
    <ScreenShell
      title={t("professional.browse")}
      subtitle={t("professional.browseSubtitle")}
    >
      {!isVerified ? (
        <PlaceholderCard text={t("professional.notVerified")} />
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch}
          tintColor={colors.purple}
          colors={[colors.purple]}
        />
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <BrandSpinner size="large" />
          ) : children.length === 0 ? (
            <PlaceholderCard text={t("professional.noChildren")} />
          ) : (
            <>
              <View className="mb-6">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-6 flex-row">
                  <View className="w-64">
                    <ChipSelect
                      label={t("admin.fields.category")}
                      options={[
                        { value: "autism", label: t("enums.needCategory.autism") },
                        { value: "adhd", label: t("enums.needCategory.adhd") },
                        { value: "developmental_delay", label: t("enums.needCategory.developmental_delay") },
                        { value: "physical_disability", label: t("enums.needCategory.physical_disability") },
                        { value: "learning_disability", label: t("enums.needCategory.learning_disability") },
                        { value: "behavioral", label: t("enums.needCategory.behavioral") },
                      ]}
                      value={filterCategory}
                      onChange={(val) => setFilterCategory(val === filterCategory ? null : val)}
                    />
                  </View>
                  <View className="w-64">
                    <ChipSelect
                      label={t("admin.fields.framework")}
                      options={[
                        { value: "regular_school", label: t("enums.frameworkType.regular_school") },
                        { value: "regular_kindergarten", label: t("enums.frameworkType.regular_kindergarten") },
                        { value: "special_ed_school", label: t("enums.frameworkType.special_ed_school") },
                        { value: "special_ed_kindergarten", label: t("enums.frameworkType.special_ed_kindergarten") },
                        { value: "communication_kindergarten", label: t("enums.frameworkType.communication_kindergarten") },
                      ]}
                      value={filterFramework}
                      onChange={(val) => setFilterFramework(val === filterFramework ? null : val)}
                    />
                  </View>
                  <View className="w-64">
                    <ChipSelect
                      label={t("parent.fields.age")}
                      options={[
                        { value: "0_3", label: "0-3" },
                        { value: "4_6", label: "4-6" },
                        { value: "7_12", label: "7-12" },
                        { value: "13_plus", label: "13+" },
                      ]}
                      value={filterAge}
                      onChange={(val) => setFilterAge(val === filterAge ? null : val)}
                    />
                  </View>
                  <View className="w-64">
                    <ChipSelect
                      label={t("parent.fields.communication")}
                      options={[
                        { value: "verbal", label: t("professional.verbal") },
                        { value: "non_verbal", label: t("professional.nonVerbal") },
                      ]}
                      value={filterCommunication}
                      onChange={(val) => setFilterCommunication(val === filterCommunication ? null : val)}
                    />
                  </View>
                </ScrollView>
              </View>

              {filteredChildren.length === 0 ? (
                <PlaceholderCard text={t("professional.noChildren")} />
              ) : (
                filteredChildren.map((child) => (
                  <BrowseChildCard
                    key={child.id}
                    childName={child.first_name}
                    age={child.age}
                    categoryLabel={t(`enums.needCategory.${child.category}`)}
                    frameworkLabel={t(`enums.frameworkType.${child.framework}`)}
                    functioningLabel={t(
                      `parent.functioningLevel${child.functioning_level}`,
                    )}
                    communicationLabel={
                      child.communication_verbal
                        ? t("professional.verbal")
                        : t("professional.nonVerbal")
                    }
                    interestLabel={t("professional.expressInterest")}
                    onExpressInterest={() => handleInterest(child.id)}
                    loading={interest.isPending}
                  />
                ))
              )}
            </>
          )}
          <View className="h-6" />
        </ScrollView>
      )}
    </ScreenShell>
  );
}
