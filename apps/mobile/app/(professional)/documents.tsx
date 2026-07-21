import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  ActivityIndicator,
} from "react-native";

import { DocumentChecklist } from "@/components/professional/DocumentChecklist";
import { PrimaryButton, ScreenShell } from "@/components/ui/Screen";
import type { DocumentType } from "@/lib/api/documents";
import { pickDocumentOrImage, uploadPickedDocument } from "@/lib/uploads";
import {
  buildDocumentChecklist,
  hasAllRequiredDocuments,
  OPTIONAL_DOC_TYPES,
  verificationProgress } from "@/lib/verification";
import { useDeleteDocument, useDocuments } from "@/hooks/useDocuments";
import { useSubmitForVerification } from "@/hooks/useVerification";
import { useMyProfessional } from "@/hooks/useProfessional";
import { errorMessage, showError, showSuccess } from "@/lib/feedback";
import { useAuthStore } from "@/stores/auth-store";
import { BrandSpinner } from "@/components/motion/BrandSpinner";


export default function ProfessionalDocumentsScreen() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;

  const { data: professional } = useMyProfessional(userId);
  const { data: documents = [], isLoading, refetch } = useDocuments(userId);
  const del = useDeleteDocument(userId);
  const submitReview = useSubmitForVerification(userId);

  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);

  const checklist = buildDocumentChecklist(documents);
  const progress = verificationProgress(documents);
  const allRequired = hasAllRequiredDocuments(documents);
  const verificationStatus = professional?.verified ?? "pending";

  async function handleUpload(docType: DocumentType) {
    if (!userId) return;

    const existing = documents.find((d) => d.doc_type === docType);
    if (existing) {
      try {
        await del.mutateAsync({ id: existing.id, storagePath: existing.storage_path });
      } catch {
        // continue — replacement upload may still work
      }
    }

    try {
      const file = await pickDocumentOrImage();
      if (!file) return;

      setUploadingType(docType);
      await uploadPickedDocument(userId, docType, file);
      const refreshed = await refetch();
      const docs = refreshed.data ?? [];

      if (
        hasAllRequiredDocuments(docs) &&
        (verificationStatus === "pending" || verificationStatus === "rejected")
      ) {
        try {
          await submitReview.mutateAsync(docs);
        } catch {
          // submitted status may fail if already submitted — non-fatal
        }
      }

      showSuccess({ title: t("professional.uploadSuccess") });
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const message = raw === "FILE_TOO_LARGE" ? t("professional.uploadTooLarge") : raw;
      showError(message);
    } finally {
      setUploadingType(null);
    }
  }

  function getStatusLabel(status: (typeof checklist)[number]["status"]) {
    return t(`professional.docChecklist.${status}`);
  }

  return (
    <ScreenShell
      eyebrow={t("professional.documentsEyebrow")}
      title={t("professional.documentsTitle")}
      subtitle={t("professional.documentsSubtitle")}
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="bg-purple-bg border border-purple rounded-card p-4 mb-6">
          <Text className="text-sm font-bold text-purple-ink mb-2 font-rubik text-start">
            {t("professional.documentsProgress", { percent: progress })}
          </Text>
          <View className="h-2 bg-surface rounded-full overflow-hidden">
            <View
              className="h-full bg-purple rounded-full"
              style={{ width: `${progress}%` }}
            />
          </View>
          {allRequired && verificationStatus === "submitted" ? (
            <Text className="text-sm text-teal mt-3 text-start leading-5">
              {t("professional.documentsSubmitted")}
            </Text>
          ) : allRequired ? (
            <Text className="text-sm text-ink-2 mt-3 text-start leading-5">
              {t("professional.documentsReadySubmit")}
            </Text>
          ) : (
            <Text className="text-sm text-ink-2 mt-3 text-start leading-5">
              {t("professional.documentsRequiredHint")}
            </Text>
          )}
        </View>

        <Text className="text-sm font-bold text-purple mb-3 font-rubik text-start">
          {t("professional.documentsRequiredTitle")}
        </Text>

        {isLoading ? (
          <BrandSpinner size="large" />
        ) : (
          <DocumentChecklist
            items={checklist}
            getLabel={(type) => t(`professional.docTypes.${type}`)}
            getStatusLabel={getStatusLabel}
            getUploadLabel={(status, uploading) =>
              uploading
                ? t("common.loading")
                : status === "rejected"
                  ? t("professional.uploadReupload")
                  : t("professional.uploadAdd")
            }
            onUpload={(type) => handleUpload(type as DocumentType)}
            uploadingType={uploadingType}
          />
        )}

        <Text className="text-sm font-bold text-purple mb-3 font-rubik text-start">
          {t("professional.documentsOptionalTitle")}
        </Text>
        {OPTIONAL_DOC_TYPES.map((docType) => {
          const existing = documents.find((d) => d.doc_type === docType);
          const uploading = uploadingType === docType;
          return (
            /* eslint-disable-next-line no-restricted-syntax -- optional-document list row (name + upload affordance), not a button */
            <Pressable
              key={docType}
              onPress={() => handleUpload(docType)}
              disabled={uploading || uploadingType !== null}
              className="bg-surface border border-border rounded-card px-4 py-4 mb-2 flex-row items-center justify-between active:opacity-90"
            >
              <Text className="text-base font-medium text-ink">
                {existing ? "✓ " : ""}
                {t(`professional.docTypes.${docType}`)}
              </Text>
              {uploading ? (
                <ActivityIndicator size="small" color="#534AB7" />
              ) : (
                <Text className="text-purple text-sm font-semibold font-rubik">
                  + {t("professional.uploadNow")}
                </Text>
              )}
            </Pressable>
          );
        })}

        <View className="pb-10 mt-4">
          <PrimaryButton
            label={t("professional.documentsRefresh")}
            onPress={() => refetch()}
            variant="teal"
          />
        </View>
      </ScrollView>
    </ScreenShell>
  );
}
