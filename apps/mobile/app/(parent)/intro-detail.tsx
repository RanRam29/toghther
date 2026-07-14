import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ScreenShell } from "@/components/ui/Screen";
import { MetricSelector } from "@/components/active-match/MetricSelector";
import { useChildren } from "@/hooks/useChildren";
import { useMatchRequests, useDeclineAfterIntro } from "@/hooks/useMatchRequests";
import { useIntroContact } from "@/hooks/useIntroContact";
import { useCreateMatchFromRequest } from "@/hooks/useActiveMatch";
import { useMetricsForChild, useSetMatchMetrics } from "@/hooks/useMetrics";
import { AnalyticsEvents } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { useAuthStore } from "@/stores/auth-store";

export default function IntroDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();

  const session = useAuthStore((s) => s.session);
  const parentId = session?.user?.id;
  const { children } = useChildren(parentId);
  const childIds = children.map((c) => c.id);

  const { data: requests = [] } = useMatchRequests(parentId, childIds);
  const request = requests.find((r) => r.id === requestId);
  const child = children.find((c) => c.id === request?.child_id);
  const isSecondary = child?.secondary_parent_id === parentId;
  const canApprove = (child?.secondary_parent_permissions as any)?.can_approve ?? false;
  const canManage = !isSecondary || canApprove;

  const professionalId = request?.professional_id;
  const { data: contact, isLoading: isLoadingContact } = useIntroContact(
    request?.status === "approved" ? requestId : undefined,
  );

  const createMatch = useCreateMatchFromRequest(parentId);
  const declineIntro = useDeclineAfterIntro(parentId);
  const metricsQuery = useMetricsForChild(child?.id);
  const setMetrics = useSetMatchMetrics();

  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineInput, setShowDeclineInput] = useState(false);
  const [metricStep, setMetricStep] = useState(false);
  const [newMatchId, setNewMatchId] = useState<string | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);

  useEffect(() => {
    if (
      request?.id &&
      (request.status === "interested" || request.status === "rejected")
    ) {
      void track(AnalyticsEvents.REQUEST_RESPONSE_SEEN, {
        request_id: request.id,
        response: request.status,
      });
    }
  }, [request?.id, request?.status]);

  if (!request) {
    return (
      <ScreenShell
        title={t("parent.introDetails") || "פרטי היכרות"}
        showBack
        backFallbackHref="/(parent)/(tabs)/requests"
      >
        <View className="flex-1 items-center justify-center">
          <Text className="text-ink text-base">{t("common.notFound") || "לא נמצאה בקשה"}</Text>
        </View>
      </ScreenShell>
    );
  }

  if (isLoadingContact) {
    return (
      <ScreenShell
        title={t("parent.introDetails") || "פרטי היכרות"}
        showBack
        backFallbackHref="/(parent)/(tabs)/requests"
      >
        <ActivityIndicator size="large" color="#534AB7" className="mt-8" />
      </ScreenShell>
    );
  }

  if (!contact) {
    return (
      <ScreenShell
        title={t("parent.introDetails")}
        showBack
        backFallbackHref="/(parent)/(tabs)/requests"
      >
        <View className="flex-1 items-center justify-center">
          <Text className="text-ink text-base">{t("parent.introNotReady")}</Text>
        </View>
      </ScreenShell>
    );
  }

  async function handleStartWorking() {
    try {
      const matchId = await createMatch.mutateAsync(requestId!);
      setNewMatchId(matchId);
      setMetricStep(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.error");
      Alert.alert("שגיאה", message);
    }
  }

  function toggleMetric(key: string) {
    setSelectedMetrics((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  }

  async function handleConfirmMetrics() {
    if (!newMatchId || selectedMetrics.length !== 3) {
      Alert.alert("שגיאה", t("activeMatch.metricsRequired"));
      return;
    }
    try {
      await setMetrics.mutateAsync({ matchId: newMatchId, keys: selectedMetrics });
      Alert.alert(
        t("parent.matchStartedTitle") || "בשעה טובה! 🎉",
        t("parent.matchStartedDesc") || "העבודה המשותפת החלה. אתם מועברים ללוח הבקרה.",
        [
          {
            text: t("common.continue") || "המשך",
            onPress: () => {
              router.push({
                pathname: "/(active-match)",
                params: { matchId: newMatchId },
              });
            },
          },
        ],
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.error");
      Alert.alert("שגיאה", message);
    }
  }

  async function handleDecline() {
    if (!declineReason.trim()) {
      Alert.alert("שגיאה", "אנא הזן סיבה לדחייה");
      return;
    }
    try {
      await declineIntro.mutateAsync({ requestId: requestId!, reason: declineReason });
      Alert.alert("עודכן", "הבקשה בוטלה בהצלחה", [
        {
          text: "חזרה לבקשות",
          onPress: () => router.push("/(parent)/(tabs)/requests"),
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.error");
      Alert.alert("שגיאה", message);
    }
  }

  const phone = contact.phone ?? t("parent.phoneUnavailable");

  if (metricStep && newMatchId) {
    return (
      <ScreenShell
        title={t("activeMatch.selectMetricsTitle")}
        showBack
        backFallbackHref="/(parent)/(tabs)/requests"
      >
        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          <MetricSelector
            metrics={metricsQuery.data ?? []}
            selected={selectedMetrics}
            onToggle={toggleMetric}
            label={t("activeMatch.selectMetricsTitle")}
            hint={t("activeMatch.selectMetricsHint")}
            getLabel={(item) =>
              i18n.language === "he" ? item.he_label : item.en_label
            }
          />
          <Pressable
            onPress={handleConfirmMetrics}
            disabled={selectedMetrics.length !== 3 || setMetrics.isPending}
            className="bg-teal py-4 rounded-full items-center active:opacity-90 mt-4"
          >
            <Text className="text-white font-bold text-lg font-rubik">
              {t("activeMatch.confirmMetrics")}
            </Text>
          </Pressable>
        </ScrollView>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title={t("parent.introDetails") || "פרטי היכרות"}
      showBack
      backFallbackHref="/(parent)/(tabs)/requests"
    >
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        <View className="bg-surface p-6 rounded-card border border-border mb-6">
          <Text className="text-2xl font-bold text-ink mb-2 text-center font-rubik">
            {contact.display_name}
          </Text>
          <Text className="text-sm text-ink-2 mb-6 text-center">
            קבעו שיחה קצרה ואז מפגש עם {child?.first_name}
          </Text>

          <View className="flex-row items-center justify-center mb-6">
            <Ionicons name="call" size={24} color="#534AB7" />
            <Text className="text-xl font-semibold text-purple ms-3 font-rubik">
              {phone}
            </Text>
          </View>

          <View className="flex-row gap-4 justify-center">
            {phone !== t("parent.phoneUnavailable") && (
              <>
                <Pressable
                  onPress={() => Linking.openURL(`tel:${phone}`)}
                  className="bg-purple/10 px-6 py-3 rounded-full"
                >
                  <Text className="text-purple font-semibold">חייג</Text>
                </Pressable>
                <Pressable
                  onPress={() => Linking.openURL(`whatsapp://send?phone=${phone}`)}
                  className="bg-green-500/10 px-6 py-3 rounded-full"
                >
                  <Text className="text-green-600 font-semibold">WhatsApp</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {!showDeclineInput ? (
          <View className="gap-3 mt-4 mb-8">
            <Pressable
              onPress={handleStartWorking}
              disabled={createMatch.isPending || !canManage}
              className={`${!canManage ? "opacity-50" : ""} bg-teal py-4 rounded-full items-center active:opacity-90`}
            >
              <Text className="text-white font-bold text-lg font-rubik">
                התחלנו לעבוד יחד! 🎉
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowDeclineInput(true)}
              disabled={!canManage}
              className={`${!canManage ? "opacity-50" : ""} py-4 items-center`}
            >
              <Text className="text-ink-2 font-semibold text-base font-rubik">
                לא התאים
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="bg-surface p-4 rounded-card border border-border mb-8">
            <Text className="text-base font-bold text-ink mb-2">
              מדוע לא התאים?
            </Text>
            <TextInput
              className="border border-border rounded-lg p-3 text-ink bg-white text-start h-24 mb-4"
              multiline
              textAlignVertical="top"
              placeholder="כתוב בקצרה למה לא הסתדר, זה יעזור לנו למצוא התאמה טובה יותר בפעם הבאה..."
              value={declineReason}
              onChangeText={setDeclineReason}
            />
            <View className="flex-row flex-wrap gap-3 justify-end">
              <Pressable
                onPress={handleDecline}
                disabled={declineIntro.isPending}
                className="bg-coral px-5 py-3 rounded-full items-center active:opacity-90"
              >
                <Text className="text-white font-semibold">סיום התהליך</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowDeclineInput(false)}
                className="px-5 py-3 rounded-full items-center border border-ink-2 active:opacity-90"
              >
                <Text className="text-ink-2 font-semibold">חזור</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenShell>
  );
}
