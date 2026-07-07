import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";

import { IncomingRequestCard } from "@/components/professional/Cards";
import { PlaceholderCard, ScreenShell } from "@/components/ui/Screen";
import {
  useIncomingRequests,
  useMyProfessional,
  useRespondToRequest,
} from "@/hooks/useProfessional";
import { useAuthStore } from "@/stores/auth-store";

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber",
  interested: "text-teal",
  approved: "text-teal",
  rejected: "text-coral",
  expired: "text-ink-2",
  withdrawn: "text-ink-2",
};

export default function ProfessionalHomeScreen() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;

  const { data: professional } = useMyProfessional(userId);
  const professionalId = professional?.id;

  const {
    data: requests = [],
    isLoading,
    refetch,
    isRefetching,
  } = useIncomingRequests(professionalId);

  const respond = useRespondToRequest(professionalId);

  function handleRespond(requestId: string, status: "interested" | "rejected") {
    respond.mutate(
      { requestId, status },
      {
        onError: (err) => {
          const message =
            err instanceof Error ? err.message : t("common.tryAgain");
          Alert.alert(t("common.error"), message);
        },
      },
    );
  }

  return (
    <ScreenShell
      title={t("professional.homeTitle")}
      subtitle={t("professional.homeSubtitle")}
    >
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#0F6E56" className="mt-8" />
        ) : requests.length === 0 ? (
          <PlaceholderCard text={t("professional.noRequests")} />
        ) : (
          requests.map((request) => {
            const child = request.child;
            const isPending = request.status === "pending";

            return (
              <IncomingRequestCard
                key={request.id}
                childName={child?.first_name ?? t("professional.hiddenChild")}
                age={child?.age ?? 0}
                categoryLabel={
                  child ? t(`enums.needCategory.${child.category}`) : ""
                }
                frameworkLabel={
                  child ? t(`enums.frameworkType.${child.framework}`) : ""
                }
                functioningLabel={
                  child
                    ? t(`parent.functioningLevel${child.functioning_level}`)
                    : ""
                }
                communicationLabel={
                  child
                    ? child.communication_verbal
                      ? t("professional.verbal")
                      : t("professional.nonVerbal")
                    : ""
                }
                statusLabel={t(`enums.requestStatus.${request.status}`)}
                statusColor={STATUS_COLORS[request.status] ?? "text-ink-2"}
                parentMessage={request.parent_message}
                matchReason={request.match_reason}
                canRespond={isPending}
                respondLabel={t("professional.accept")}
                rejectLabel={t("professional.reject")}
                onAccept={() => handleRespond(request.id, "interested")}
                onReject={() => handleRespond(request.id, "rejected")}
                loading={respond.isPending}
              />
            );
          })
        )}
        <View className="h-6" />
      </ScrollView>
    </ScreenShell>
  );
}
