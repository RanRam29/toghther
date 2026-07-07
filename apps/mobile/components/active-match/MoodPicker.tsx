import { Pressable, Text, View } from "react-native";

const MOODS: { value: number; emoji: string; labelKey: string }[] = [
  { value: 1, emoji: "😞", labelKey: "activeMatch.mood1" },
  { value: 2, emoji: "😕", labelKey: "activeMatch.mood2" },
  { value: 3, emoji: "😐", labelKey: "activeMatch.mood3" },
  { value: 4, emoji: "🙂", labelKey: "activeMatch.mood4" },
  { value: 5, emoji: "😄", labelKey: "activeMatch.mood5" },
];

interface MoodPickerProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  renderLabel: (labelKey: string) => string;
}

export function MoodPicker({
  label,
  value,
  onChange,
  renderLabel,
}: MoodPickerProps) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-ink-2 mb-2">{label}</Text>
      <View className="flex-row gap-2">
        {MOODS.map((mood) => {
          const selected = mood.value === value;
          return (
            <Pressable
              key={mood.value}
              onPress={() => onChange(mood.value)}
              className={`flex-1 items-center rounded-card py-3 border ${
                selected
                  ? "bg-purple-bg border-purple"
                  : "bg-surface border-border active:opacity-90"
              }`}
            >
              <Text className="text-2xl">{mood.emoji}</Text>
              <Text
                className={`text-xs mt-1 ${
                  selected ? "text-purple-ink font-semibold" : "text-ink-2"
                }`}
              >
                {renderLabel(mood.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface MoodBadgeProps {
  value: number;
}

export function MoodBadge({ value }: MoodBadgeProps) {
  const mood = MOODS.find((m) => m.value === value) ?? MOODS[2];
  return (
    <View className="w-10 h-10 rounded-full bg-purple-bg items-center justify-center">
      <Text className="text-xl">{mood.emoji}</Text>
    </View>
  );
}
