import { useCallback, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { BioHighlight, BioWarning } from "@/components/admin/BioHighlight";
import { DocumentViewer } from "@/components/admin/DocumentViewer";
import { RejectDocumentModal } from "@/components/admin/RejectDocumentModal";
import { SlaBadge } from "@/components/admin/SlaBadge";
import { VerificationChecklist } from "@/components/admin/VerificationChecklist";
import { PrimaryButton } from "@/components/ui/Screen";
import {
  bioHasContactPatterns,
  emptyChecklistState,
  getSlaLevel,
  isChecklistComplete,
  type VerificationChecklistKey,
  type VerificationChecklistState,
} from "@/lib/admin-verification";
import { supervisorLogDocumentView } from "@/lib/api/supervisor";
import {
  canSupervisorReject,
  isAssignedToUser,
} from "@/lib/supervisor-gate";
import { REQUIRED_DOC_TYPES } from "@/lib/verification";
import { useStaffRoute } from "@/hooks/useStaffRoute";
import {
  useProfessionalDocuments,
  useProfessionalReview,
  useReleaseAssignment,
  useStaffRejectDocument,
  useStaffVerifyProfessional,
} from "@/hooks/useSupervisorQueue";

export default function StaffReviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const professionalId = typeof id === "string" ? id : id?.[0];
  const { isAdmin, isSupervisor, userId } = useStaffRoute();

  const includePhoneAlways = isAdmin;
  const useSupervisorRpc = isSupervisor;

  const { data: professional, isLoading: proLoading } = useProfessionalReview(
    professionalId,
    includePhoneAlways,
  );
  const { data: documents = [], isLoading: docsLoading } =
    useProfessionalDocuments(professional?.user_id);

  const verify = useStaffVerifyProfessional(useSupervisorRpc);
  const reject = useStaffRejectDocument(useSupervisorRpc);
  const release = useReleaseAssignment();

  const [checklist, setChecklist] = useState<VerificationChecklistState>(
    emptyChecklistState(),
  );
  const [rejectOpen, setRejectOpen] = useState(false);
  const [viewedDocIds, setViewedDocIds] = useState<Set<string>>(new Set());
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);

  const checklistDone = isChecklistComplete(checklist);
  const bioFlagged = bioHasContactPatterns(professional?.bio);
  const assignedToMe = isAssignedToUser(
    professional?.assigned_supervisor_id,
    userId,
  );
  const canAct = isAdmin || assignedToMe;
  const canReject = isAdmin
    ? true
    : canSupervisorReject(documents, viewedDocIds);

  const displayPhone =
    revealedPhone ??
    (includePhoneAlways ? professional?.profile?.phone : null);

  const handleDocumentViewed = useCallback((documentId: string) => {
    setViewedDocIds((prev) => {
      const next = new Set(prev);
      next.add(documentId);
      return next;
    });
    if (isSupervisor) {
      void supervisorLogDocumentView(documentId);
    }
  }, [isSupervisor]);

  function toggleChecklist(key: VerificationChecklistKey) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleApprove() {
    if (!professionalId || !checklistDone || !canAct) return;

    verify.mutate(
      {
        professionalId,
        checklist,
        submittedAt: professional?.updated_at,
      },
      {
        onSuccess: () => {
          Alert.alert(t("admin.approveSuccess"));
          router.replace("/(staff)" as never);
        },
        onError: (err) => {
          Alert.alert(
            t("common.error"),
            err instanceof Error ? err.message : t("common.tryAgain"),
          );
        },
      },
    );
  }

  function handleReject(documentId: string, reason: string) {
    if (!professional?.user_id) return;

    reject.mutate(
      { documentId, reason, userId: professional.user_id },
      {
        onSuccess: (result) => {
          setRejectOpen(false);
          if (result.phone) setRevealedPhone(result.phone);
          else if (isAdmin && professional.profile?.phone) {
            setRevealedPhone(professional.profile.phone);
          }
          Alert.alert(t("admin.rejectSuccess"));
        },
        onError: (err) => {
          Alert.alert(
            t("common.error"),
            err instanceof Error ? err.message : t("common.tryAgain"),
          );
        },
      },
    );
  }

  function handleRelease() {
    if (!professionalId) return;
    release.mutate(professionalId, {
      onSuccess: () => router.replace("/(staff)" as never),
    });
  }

  if (proLoading || !professionalId) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#534AB7" />
      </View>
    );
  }

  if (!professional) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-ink-2 text-center">{t("admin.notFound")}</Text>
      </View>
    );
  }

  if (!canAct) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-ink-2 text-center mb-4">
          {t("staff.notAssigned")}
        </Text>
        <PrimaryButton
          label={t("common.back")}
          onPress={() => router.back()}
          variant="teal"
        />
      </View>
    );
  }

  const sla = getSlaLevel(professional.updated_at);
  const requiredDocs = REQUIRED_DOC_TYPES.map((type) => ({
    type,
    doc: documents.find((d) => d.doc_type === type) ?? null,
  }));

  return (
    <>
      <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => router.back()}
          className="self-end mb-4 active:opacity-80"
        >
          <Text className="text-purple font-semibold font-rubik">
            {t("common.back")}
          </Text>
        </Pressable>

        <View className="flex-row items-start justify-between mb-4">
          <SlaBadge level={sla} submittedAt={professional.updated_at} />
          <View className="flex-1 items-end">
            <Text className="text-2xl font-bold text-ink font-rubik">
              {professional.display_name}
            </Text>
            <Text className="text-sm text-ink-2 mt-1">
              {professional.profile?.area} · {professional.experience_years}{" "}
              {t("admin.yearsExp")}
            </Text>
          </View>
        </View>

        {displayPhone ? (
          <View className="bg-teal-bg border border-teal rounded-card p-4 mb-4">
            <Text className="text-sm font-bold text-teal mb-1 text-right">
              {t("staff.phoneRevealed")}
            </Text>
            <Text className="text-lg text-ink text-right font-rubik">
              {displayPhone}
            </Text>
          </View>
        ) : isSupervisor ? (
          <View className="bg-amber-bg border border-amber rounded-card p-3 mb-4">
            <Text className="text-sm text-amber-ink text-right leading-5">
              {t("staff.phoneHidden")}
            </Text>
          </View>
        ) : null}

        {professional.profile?.avatar_url ? (
          <Image
            source={{ uri: professional.profile.avatar_url }}
            className="w-20 h-20 rounded-full self-end mb-4 bg-bg border border-border"
          />
        ) : null}

        <View className="bg-surface border border-border rounded-card p-4 mb-4">
          <Text className="text-sm font-bold text-ink mb-2 font-rubik text-right">
            {t("admin.bioLabel")}
          </Text>
          <BioHighlight bio={professional.bio} emptyLabel={t("admin.bioEmpty")} />
          {bioFlagged ? (
            <BioWarning message={t("admin.bioContactWarning")} />
          ) : null}
        </View>

        <Text className="text-base font-bold text-ink mb-3 font-rubik text-right">
          {t("admin.documentsTitle")}
        </Text>

        {docsLoading ? (
          <ActivityIndicator size="small" color="#534AB7" className="mb-6" />
        ) : (
          requiredDocs.map(({ type, doc }) =>
            doc ? (
              <DocumentViewer
                key={type}
                document={doc}
                label={t(`professional.docTypes.${type}`)}
                onViewed={handleDocumentViewed}
              />
            ) : (
              <View
                key={type}
                className="bg-coral-bg border border-coral rounded-card p-4 mb-4"
              >
                <Text className="text-coral text-right font-semibold">
                  {t(`professional.docTypes.${type}`)} — {t("admin.docMissing")}
                </Text>
              </View>
            ),
          )
        )}

        <VerificationChecklist state={checklist} onToggle={toggleChecklist} />

        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <PrimaryButton
              label={t("admin.rejectDocument")}
              onPress={() => setRejectOpen(true)}
              variant="teal"
              disabled={verify.isPending || (!isAdmin && !canReject)}
            />
          </View>
          <View className="flex-1">
            <PrimaryButton
              label={t("admin.approve")}
              onPress={handleApprove}
              loading={verify.isPending}
              disabled={!checklistDone || verify.isPending}
            />
          </View>
        </View>

        {isAdmin && professional.assigned_supervisor_id ? (
          <PrimaryButton
            label={t("staff.releaseAssignment")}
            onPress={handleRelease}
            loading={release.isPending}
            variant="teal"
          />
        ) : null}

        {!checklistDone ? (
          <Text className="text-sm text-ink-2 text-center mb-8">
            {t("admin.approveLocked")}
          </Text>
        ) : (
          <View className="h-8" />
        )}
      </ScrollView>

      <RejectDocumentModal
        visible={rejectOpen}
        documents={documents}
        getDocLabel={(type) => t(`professional.docTypes.${type}`)}
        loading={reject.isPending}
        canSubmit={isAdmin || canReject}
        gateHint={
          isAdmin ? undefined : t("staff.rejectGateHint")
        }
        onClose={() => setRejectOpen(false)}
        onSubmit={handleReject}
      />
    </>
  );
}
