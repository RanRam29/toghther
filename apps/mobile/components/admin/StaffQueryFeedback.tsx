import { useTranslation } from "react-i18next";
import { ActivityIndicator, Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui/Screen";

interface StaffQueryFeedbackProps {
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
}

export function StaffQueryFeedback({
  isLoading,
  isError,
  error,
  isEmpty,
  emptyMessage,
  onRetry,
}: StaffQueryFeedbackProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <View className="py-8 items-center">
        <ActivityIndicator size="large" color="#534AB7" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="py-8 items-center gap-3">
        <Text className="text-ink-2 text-center font-rubik">
          {error?.message ?? t("staff.loadError")}
        </Text>
        {onRetry ? (
          <PrimaryButton label={t("common.tryAgain")} onPress={onRetry} />
        ) : null}
      </View>
    );
  }

  if (isEmpty && emptyMessage) {
    return (
      <Text className="text-ink-2 text-right py-4 font-rubik">{emptyMessage}</Text>
    );
  }

  return null;
}
