import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, Text, TextInput, View } from "react-native";

import type { DocumentUpload } from "@/lib/api/documents";
import { PrimaryButton } from "@/components/ui/Screen";

interface RejectDocumentModalProps {
  visible: boolean;
  documents: DocumentUpload[];
  getDocLabel: (type: string) => string;
  loading?: boolean;
  canSubmit?: boolean;
  gateHint?: string;
  onClose: () => void;
  onSubmit: (documentId: string, reason: string) => void;
}

export function RejectDocumentModal({
  visible,
  documents,
  getDocLabel,
  loading,
  canSubmit = true,
  gateHint,
  onClose,
  onSubmit,
}: RejectDocumentModalProps) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const requiredDocs = documents.filter((d) =>
    ["id_card", "criminal_record", "certificate"].includes(d.doc_type),
  );

  function handleSubmit() {
    if (!selectedId || !reason.trim()) return;
    onSubmit(selectedId, reason.trim());
    setSelectedId(null);
    setReason("");
  }

  function handleClose() {
    setSelectedId(null);
    setReason("");
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 justify-center px-6">
        <View className="bg-bg rounded-card p-6 border border-border max-w-lg w-full self-center">
          <Text className="text-xl font-bold text-ink mb-2 font-rubik text-right">
            {t("admin.rejectTitle")}
          </Text>
          <Text className="text-sm text-ink-2 mb-4 text-right leading-5">
            {gateHint ?? t("admin.rejectSubtitle")}
          </Text>

          {requiredDocs.map((doc) => (
            <Pressable
              key={doc.id}
              onPress={() => setSelectedId(doc.id)}
              className={`rounded-card px-4 py-3 mb-2 border ${
                selectedId === doc.id
                  ? "bg-purple-bg border-purple"
                  : "bg-surface border-border"
              }`}
            >
              <Text className="text-base text-ink text-right font-rubik">
                {getDocLabel(doc.doc_type)}
              </Text>
            </Pressable>
          ))}

          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder={t("admin.rejectReasonPlaceholder")}
            placeholderTextColor="#918D84"
            multiline
            numberOfLines={3}
            className="bg-surface border border-border rounded-card px-4 py-3 text-ink text-right min-h-[80px] mb-4"
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <PrimaryButton
                label={t("common.cancel")}
                onPress={handleClose}
                variant="teal"
              />
            </View>
            <View className="flex-1">
              <PrimaryButton
                label={t("admin.rejectConfirm")}
                onPress={handleSubmit}
                loading={loading}
                disabled={!selectedId || !reason.trim() || !canSubmit}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
