import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";

import { BrowseChildCard } from "@/components/professional/Cards";
import { PlaceholderCard, ScreenShell } from "@/components/ui/Screen";
import {
  useExpressInterest,
  useMyProfessional,
  usePublishedChildren,
} from "@/hooks/useProfessional";
import { useAuthStore } from "@/stores/auth-store";

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
    isRefetching,
  } = usePublishedChildren(Boolean(professionalId));

  const interest = useExpressInterest(professionalId);

  function handleInterest(childId: string) {
    interest.mutate(childId, {
      onSuccess: () => Alert.alert(t("professional.interestSent")),
      onError: (err) => {
        const message = err instanceof Error ? err.message : t("common.tryAgain");
        Alert.alert(t("common.error"), message);
      },
    });
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
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color="#0F6E56" className="mt-8" />
          ) : children.length === 0 ? (
            <PlaceholderCard text={t("professional.noChildren")} />
          ) : (
            children.map((child) => (
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
          <View className="h-6" />
        </ScrollView>
      )}
    </ScreenShell>
  );
}
