import { Pressable, Text, View } from "react-native";

interface MetricStepperProps {
  label: string;
  description?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export function MetricStepper({
  label,
  description,
  value,
  min = 0,
  max = 5,
  onChange,
}: MetricStepperProps) {
  function clamp(next: number) {
    if (next < min) return min;
    if (next > max) return max;
    return next;
  }

  return (
    <View className="mb-4 bg-surface border border-border rounded-card px-4 py-4">
      <Text className="text-base font-medium text-ink">{label}</Text>
      {description ? (
        <Text className="text-sm text-ink-2 mt-1 leading-5">{description}</Text>
      ) : null}
      <View className="flex-row items-center justify-between mt-3">
        <Pressable
          onPress={() => onChange(clamp(value - 1))}
          disabled={value <= min}
          className={`w-10 h-10 rounded-full items-center justify-center border ${
            value <= min ? "border-border opacity-50" : "border-purple active:opacity-90"
          }`}
        >
          <Text
            className={`text-lg font-bold ${
              value <= min ? "text-ink-3" : "text-purple"
            }`}
          >
            −
          </Text>
        </Pressable>

        <Text className="text-2xl font-bold text-ink font-rubik min-w-[40px] text-center">
          {value}
        </Text>

        <Pressable
          onPress={() => onChange(clamp(value + 1))}
          disabled={value >= max}
          className={`w-10 h-10 rounded-full items-center justify-center border ${
            value >= max ? "border-border opacity-50" : "border-purple active:opacity-90"
          }`}
        >
          <Text
            className={`text-lg font-bold ${
              value >= max ? "text-ink-3" : "text-purple"
            }`}
          >
            +
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
