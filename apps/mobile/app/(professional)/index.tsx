import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { IncomingRequestCard } from "@/components/professional/Cards";
import { ActiveMatchBanner } from "@/components/shared/ActiveMatchBanner";
import { PendingInvitations } from "@/components/parent/PendingInvitations";
import { PlaceholderCard, ScreenShell } from "@/components/ui/Screen";
import { useActiveMatchForProfessional } from "@/hooks/useActiveMatch";
import {
  useIncomingRequests,
  useMyProfessional,
  useRespondToRequest,
} from "@/hooks/useProfessional";
import { promptPushPermission } from "@/components/shared/PushPermissionProvider";
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
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;

  const { data: professional } = useMyProfessional(userId);
  const professionalId = professional?.id;

  const { data: activeMatch } = useActiveMatchForProfessional(professionalId);

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
        onSuccess: () => {
          if (status === "interested" && userId) {
            void promptPushPermission(userId);
          }
        },
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
      headerRight={
        <Pressable onPress={() => router.push("/settings")} className="p-2 -me-2 bg-surface rounded-full border border-border">
          <Ionicons name="settings-outline" size={24} color="#0F6E56" />
        </Pressable>
      }
    >
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeMatch ? (
          <ActiveMatchBanner
            title={t("activeMatch.bannerEyebrow")}
            subtitle={t("activeMatch.bannerSubtitleChild", {
              name: activeMatch.child?.first_name ?? "",
            })}
            actionLabel={t("professional.todayTitle")}
            onPress={() =>
              router.push({ pathname: "/(professional)/today" } as never)
            }
          />
        ) : null}

        <PendingInvitations />

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
                statusLabel={
                  request.status === "approved"
                    ? t("professional.waitingForParent")
                    : t(`enums.requestStatus.${request.status}`)
                }
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
