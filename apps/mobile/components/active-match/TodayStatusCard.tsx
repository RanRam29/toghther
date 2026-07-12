import { Text, View } from "react-native";

interface TodayStatusCardProps {
  message: string;
  hasCheckedIn: boolean;
}

export function TodayStatusCard({ message, hasCheckedIn }: TodayStatusCardProps) {
  return (
    <View
      className={`rounded-card p-4 mb-4 border ${
        hasCheckedIn ? "bg-teal-bg border-teal" : "bg-surface border-border"
      }`}
    >
      <Text
        className={`text-sm font-semibold leading-5 text-right ${
          hasCheckedIn ? "text-teal-ink" : "text-ink-2"
        }`}
      >
        {message}
      </Text>
    </View>
  );
}
