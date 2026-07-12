import { Pressable, Text, View } from "react-native";

import type { DocChecklistItem } from "@/lib/verification";

interface DocumentChecklistProps {
  items: DocChecklistItem[];
  getLabel: (type: string) => string;
  getStatusLabel: (status: DocChecklistItem["status"]) => string;
  getUploadLabel?: (
    status: "missing" | "rejected",
    uploading: boolean,
  ) => string;
  onUpload?: (type: string) => void;
  uploadingType?: string | null;
}

const STATUS_COLORS: Record<DocChecklistItem["status"], string> = {
  missing: "text-ink-2",
  uploaded: "text-amber",
  rejected: "text-coral",
  approved: "text-teal",
};

export function DocumentChecklist({
  items,
  getLabel,
  getStatusLabel,
  getUploadLabel,
  onUpload,
  uploadingType,
}: DocumentChecklistProps) {
  return (
    <View className="mb-6">
      {items.map((item) => {
        const uploading = uploadingType === item.type;
        const showUpload =
          onUpload && (item.status === "missing" || item.status === "rejected");

        return (
          <View
            key={item.type}
            className="bg-surface border border-border rounded-card px-4 py-4 mb-2"
          >
            <View className="flex-row items-center justify-between mb-1">
              <Text
                className={`text-sm font-semibold ${STATUS_COLORS[item.status]}`}
              >
                {getStatusLabel(item.status)}
              </Text>
              <Text className="text-base font-bold text-ink font-rubik">
                {getLabel(item.type)}
              </Text>
            </View>

            {item.document?.rejection_note ? (
              <Text className="text-sm text-coral text-right leading-5 mb-2">
                {item.document.rejection_note}
              </Text>
            ) : null}

            {showUpload ? (
              <Pressable
                onPress={() => onUpload(item.type)}
                disabled={uploading || Boolean(uploadingType)}
                className="self-end rounded-full bg-purple px-4 py-2 mt-1 active:opacity-90"
              >
                <Text className="text-white text-sm font-semibold font-rubik">
                  {getUploadLabel
                    ? getUploadLabel(
                        item.status === "rejected" ? "rejected" : "missing",
                        uploading,
                      )
                    : uploading
                      ? "..."
                      : "+"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
