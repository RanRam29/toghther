import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui/Screen";

interface ApproveDisclosureSheetProps {
  visible: boolean;
  childName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  title: string;
  subtitle: string;
  items: string[];
  confirmLabel: string;
  cancelLabel: string;
}

export function ApproveDisclosureSheet({
  visible,
  childName,
  onConfirm,
  onCancel,
  loading,
  title,
  subtitle,
  items,
  confirmLabel,
  cancelLabel,
}: ApproveDisclosureSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-bg rounded-t-3xl px-5 pt-6 pb-8 max-h-[85%]">
          <Text className="text-xl font-bold text-ink mb-2 font-rubik text-right">
            {title}
          </Text>
          <Text className="text-sm text-ink-2 mb-4 text-right leading-6">
            {subtitle.replace("{{name}}", childName)}
          </Text>

          <ScrollView className="mb-6" showsVerticalScrollIndicator={false}>
            {items.map((item) => (
              <View
                key={item}
                className="flex-row items-start gap-2 mb-3 justify-end"
              >
                <Text className="text-sm text-ink flex-1 text-right leading-5">
                  {item}
                </Text>
                <Text className="text-purple text-base">•</Text>
              </View>
            ))}
          </ScrollView>

          <PrimaryButton
            label={confirmLabel}
            onPress={onConfirm}
            loading={loading}
            variant="purple"
          />
          <Pressable onPress={onCancel} className="mt-4 py-3 items-center">
            <Text className="text-ink-2 font-semibold font-rubik">{cancelLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
