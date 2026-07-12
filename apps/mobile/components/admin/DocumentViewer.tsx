import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";

import type { DocumentUpload } from "@/lib/api/documents";
import { getStaffDocumentUrl } from "@/lib/api/supervisor";

interface DocumentViewerProps {
  document: DocumentUpload;
  label: string;
  onViewed?: (documentId: string) => void;
}

export function DocumentViewer({ document, label, onViewed }: DocumentViewerProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isImage =
    document.file_name?.match(/\.(jpe?g|png|webp)$/i) ||
    document.storage_path.match(/\.(jpe?g|png|webp)$/i);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getStaffDocumentUrl(document.storage_path)
      .then((signedUrl) => {
        if (active) {
          setUrl(signedUrl);
          onViewed?.(document.id);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [document.storage_path, document.id, onViewed]);

  return (
    <View className="bg-surface border border-border rounded-card p-4 mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-xs text-ink-2">
          {document.rejection_note ? t("admin.docRejected") : t("admin.docPending")}
        </Text>
        <Text className="text-base font-bold text-ink font-rubik">{label}</Text>
      </View>

      {document.rejection_note ? (
        <Text className="text-sm text-coral text-right mb-3 leading-5">
          {document.rejection_note}
        </Text>
      ) : null}

      {loading ? (
        <ActivityIndicator size="small" color="#534AB7" />
      ) : error ? (
        <Text className="text-sm text-coral text-right">{error}</Text>
      ) : url && isImage ? (
        <Image
          source={{ uri: url }}
          className="w-full h-48 rounded-card bg-bg"
          resizeMode="contain"
        />
      ) : url ? (
        <Pressable
          onPress={() => Linking.openURL(url)}
          className="bg-purple-bg rounded-card py-3 px-4 items-center active:opacity-90"
        >
          <Text className="text-purple font-semibold font-rubik">
            {t("admin.openDocument")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
