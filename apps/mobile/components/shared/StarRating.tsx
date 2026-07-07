import { Pressable, Text, View } from "react-native";

interface StarRatingProps {
  label: string;
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  max?: number;
}

export function StarRating({
  label,
  value,
  onChange,
  readonly = false,
  max = 5,
}: StarRatingProps) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-ink-2 mb-2">{label}</Text>
      <View className="flex-row gap-2">
        {Array.from({ length: max }).map((_, index) => {
          const starValue = index + 1;
          const active = starValue <= value;
          const Star = (
            <View
              className={`w-10 h-10 rounded-full items-center justify-center border ${
                active ? "bg-amber-bg border-amber" : "bg-surface border-border"
              }`}
            >
              <Text className={`text-xl ${active ? "" : "opacity-40"}`}>★</Text>
            </View>
          );

          if (readonly || !onChange) {
            return <View key={starValue}>{Star}</View>;
          }

          return (
            <Pressable
              key={starValue}
              onPress={() => onChange(starValue)}
              className="active:opacity-90"
            >
              {Star}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
