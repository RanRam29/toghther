import { ActivityIndicator, Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui/Screen";

type CheckinResult = {
  checkin_id: string;
  is_valid: boolean;
  distance_m: number;
};

interface CheckinCardProps {
  title: string;
  description: string;
  actionLabel: string;
  onCheckIn: () => void;
  isPending: boolean;
  result: CheckinResult | null;
  error: Error | null;
  timeLabel: string;
  successLabel: (time: string, distance: number) => string;
  outOfRangeLabel: (distance: number) => string;
  errorLabel: string;
}

export function CheckinCard({
  title,
  description,
  actionLabel,
  onCheckIn,
  isPending,
  result,
  error,
  timeLabel,
  successLabel,
  outOfRangeLabel,
  errorLabel,
}: CheckinCardProps) {
  const isValid = result?.is_valid === true;
  const isOutOfRange = result != null && !result.is_valid;

  return (
    <View className="bg-surface border border-border rounded-card p-5 mb-4">
      <Text className="text-lg font-bold text-ink font-rubik mb-1">{title}</Text>
      <Text className="text-sm text-ink-2 leading-5 mb-4">{description}</Text>

      {isPending ? (
        <View className="items-center py-3">
          <ActivityIndicator size="large" color="#534AB7" />
        </View>
      ) : (
        <PrimaryButton label={actionLabel} onPress={onCheckIn} variant="purple" />
      )}

      {isValid && result ? (
        <View className="mt-4 bg-teal-bg border border-teal rounded-card px-4 py-3">
          <Text className="text-teal-ink font-semibold text-sm leading-5">
            {successLabel(timeLabel, Math.round(result.distance_m))}
          </Text>
        </View>
      ) : null}

      {isOutOfRange && result ? (
        <View className="mt-4 bg-amber-bg border border-amber rounded-card px-4 py-3">
          <Text className="text-amber-ink font-semibold text-sm leading-5">
            {outOfRangeLabel(Math.round(result.distance_m))}
          </Text>
        </View>
      ) : null}

      {error ? (
        <View className="mt-4 bg-coral-bg border border-coral rounded-card px-4 py-3">
          <Text className="text-coral-ink font-semibold text-sm leading-5">
            {errorLabel}: {error.message}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
