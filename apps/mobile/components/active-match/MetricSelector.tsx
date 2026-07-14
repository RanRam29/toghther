import { Pressable, Text, View } from "react-native";

import type { MetricCatalogItem } from "@/hooks/useMetrics";

interface MetricSelectorProps {
  metrics: MetricCatalogItem[];
  selected: string[];
  onToggle: (key: string) => void;
  label: string;
  hint: string;
  getLabel: (item: MetricCatalogItem) => string;
}

export function MetricSelector({
  metrics,
  selected,
  onToggle,
  label,
  hint,
  getLabel,
}: MetricSelectorProps) {
  return (
    <View className="mb-6">
      <Text className="text-lg font-bold text-ink mb-1 font-rubik text-start">
        {label}
      </Text>
      <Text className="text-sm text-ink-2 mb-4 text-start leading-5">{hint}</Text>
      <View className="flex-row flex-wrap gap-2 justify-end">
        {metrics.map((metric) => {
          const isSelected = selected.includes(metric.key);
          const disabled = !isSelected && selected.length >= 3;
          return (
            <Pressable
              key={metric.key}
              onPress={() => onToggle(metric.key)}
              disabled={disabled}
              className={`rounded-full px-4 py-2 border ${
                isSelected
                  ? "bg-purple border-purple"
                  : disabled
                    ? "bg-surface border-border opacity-50"
                    : "bg-surface border-border active:opacity-90"
              }`}
            >
              <Text
                className={`text-sm font-semibold font-rubik ${
                  isSelected ? "text-white" : "text-ink"
                }`}
              >
                {getLabel(metric)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="text-xs text-ink-2 mt-3 text-start">
        {selected.length}/3
      </Text>
    </View>
  );
}
