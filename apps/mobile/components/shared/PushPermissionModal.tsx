import { Modal, Pressable, Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui/Screen";

interface PushPermissionModalProps {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function PushPermissionModal({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  loading,
}: PushPermissionModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 justify-center bg-black/40 px-6">
        <View className="bg-surface rounded-card border border-border p-6">
          <Text className="text-lg font-bold text-ink mb-3 font-rubik text-right">
            {title}
          </Text>
          <Text className="text-sm text-ink-2 mb-6 text-right leading-6">{body}</Text>
          <PrimaryButton
            label={confirmLabel}
            onPress={onConfirm}
            loading={loading}
            variant="purple"
          />
          <Pressable onPress={onCancel} className="mt-4 py-2 items-center">
            <Text className="text-ink-2 font-semibold font-rubik">{cancelLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
