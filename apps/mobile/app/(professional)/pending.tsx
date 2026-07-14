import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { DocumentChecklist } from "@/components/professional/DocumentChecklist";
import { ScreenShell } from "@/components/ui/Screen";
import {
  buildDocumentChecklist,
  verificationProgress,
} from "@/lib/verification";
import { useDocuments } from "@/hooks/useDocuments";
import { useMyProfessional } from "@/hooks/useProfessional";
import { useAuthStore } from "@/stores/auth-store";

export default function PendingVerificationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const { data: professional } = useMyProfessional(userId);
  const verificationStatus = professional?.verified ?? "pending";
  const { data: documents = [], isLoading } = useDocuments(userId);

  const checklist = buildDocumentChecklist(documents);
  const progress = verificationProgress(documents);

  const statusMessage =
    verificationStatus === "rejected"
      ? t("professional.pendingRejected")
      : verificationStatus === "submitted"
        ? t("professional.pendingSubmitted")
        : t("professional.pendingBody");

  return (
    <ScreenShell
      title={t("professional.pendingTitle")}
      subtitle={t("professional.pendingSubtitle")}
      showBack
      backFallbackHref="/(professional)"
    >
      <View className="bg-amber-bg border border-amber rounded-card p-5 mb-6">
        <Text className="text-amber-ink font-bold text-lg mb-2 font-rubik text-start">
          {t(`enums.verification.${verificationStatus}`)}
        </Text>
        <Text className="text-sm text-ink-2 text-start leading-6">{statusMessage}</Text>
        <Text className="text-xs text-ink-2 mt-3 text-start">
          {t("professional.pendingSla")}
        </Text>
      </View>

      <View className="bg-surface border border-border rounded-card p-4 mb-6">
        <Text className="text-sm font-bold text-ink mb-2 font-rubik text-start">
          {t("professional.documentsProgress", { percent: progress })}
        </Text>
        <View className="h-2 bg-bg rounded-full overflow-hidden mb-4">
          <View
            className="h-full bg-teal rounded-full"
            style={{ width: `${progress}%` }}
          />
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color="#0F6E56" />
        ) : (
          <DocumentChecklist
            items={checklist}
            getLabel={(type) => t(`professional.docTypes.${type}`)}
            getStatusLabel={(status) => t(`professional.docChecklist.${status}`)}
          />
        )}
      </View>

      <Pressable
        onPress={() => router.push("/(professional)/documents" as never)}
        className="bg-purple rounded-full py-4 items-center mb-4 active:opacity-90"
      >
        <Text className="text-white font-bold font-rubik">
          {t("professional.pendingUploadCta")}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/(professional)/profile" as never)}
        className="rounded-full border border-teal py-4 items-center active:opacity-90"
      >
        <Text className="text-teal font-bold font-rubik">
          {t("professional.pendingProfileCta")}
        </Text>
      </Pressable>
    </ScreenShell>
  );
}
