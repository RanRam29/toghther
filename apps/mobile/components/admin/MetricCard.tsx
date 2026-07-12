import { Pressable, Text, View } from "react-native";

interface MetricCardProps {
  label: string;
  value: number | string;
  highlight?: "default" | "warning" | "success";
  onPress?: () => void;
}

const HIGHLIGHT: Record<NonNullable<MetricCardProps["highlight"]>, string> = {
  default: "text-ink",
  warning: "text-coral",
  success: "text-teal",
};

export function MetricCard({
  label,
  value,
  highlight = "default",
  onPress,
}: MetricCardProps) {
  const content = (
    <View className="bg-surface border border-border rounded-card p-4 flex-1 min-w-[140px] mb-3">
      <Text className="text-2xl font-bold font-rubik mb-1 text-right">
        <Text className={HIGHLIGHT[highlight]}>{value}</Text>
      </Text>
      <Text className="text-sm text-ink-2 text-right leading-5">{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} className="active:opacity-90 flex-1">
        {content}
      </Pressable>
    );
  }
  return content;
}
