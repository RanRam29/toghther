import { Text, View } from "react-native";

interface FunnelBar {
  label: string;
  value: number;
}

interface FunnelChartProps {
  bars: FunnelBar[];
  title?: string;
}

export function FunnelChart({ bars, title }: FunnelChartProps) {
  const max = Math.max(...bars.map((b) => b.value), 1);

  return (
    <View className="mt-4">
      {title ? (
        <Text className="text-sm font-bold text-ink mb-3 font-rubik text-right">
          {title}
        </Text>
      ) : null}
      {bars.map((bar) => (
        <View key={bar.label} className="mb-3">
          <View className="flex-row justify-between mb-1">
            <Text className="text-sm font-semibold text-purple">{bar.value}</Text>
            <Text className="text-sm text-ink-2">{bar.label}</Text>
          </View>
          <View className="h-3 bg-bg rounded-full overflow-hidden">
            <View
              className="h-full bg-purple rounded-full"
              style={{ width: `${Math.max(4, (bar.value / max) * 100)}%` }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
