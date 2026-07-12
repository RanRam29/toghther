import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { Child } from "@/lib/types";

interface ChildSelectorProps {
  children: Child[];
  selectedId: string | null;
  onSelect: (childId: string) => void;
  addLabel?: string;
  onAdd?: () => void;
}

export function ChildSelector({
  children,
  selectedId,
  onSelect,
  addLabel,
  onAdd,
}: ChildSelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-6"
      contentContainerStyle={{ paddingHorizontal: 4, gap: 8 }}
    >
      {children.map((child) => {
        const selected = child.id === selectedId;
        return (
          <Pressable
            key={child.id}
            onPress={() => onSelect(child.id)}
            className={`rounded-full px-4 py-2 border ${
              selected
                ? "bg-purple border-purple"
                : "bg-surface border-border active:opacity-90"
            }`}
          >
            <Text
              className={`text-sm font-semibold font-rubik ${
                selected ? "text-white" : "text-ink"
              }`}
            >
              {child.first_name}
            </Text>
          </Pressable>
        );
      })}
      {onAdd && addLabel ? (
        <Pressable
          onPress={onAdd}
          className="rounded-full px-4 py-2 border border-dashed border-purple bg-purple-bg active:opacity-90"
        >
          <Text className="text-sm font-semibold text-purple-ink font-rubik">
            + {addLabel}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

interface MatchCardProps {
  name: string;
  bio: string;
  matchReason: string;
  score: number;
  distanceKm: number;
  ratingAvg: number;
  distanceLabel: string;
  onPress?: () => void;
}

export function MatchCard({
  name,
  bio,
  matchReason,
  score,
  ratingAvg,
  distanceLabel,
  onPress,
}: MatchCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-surface border border-border rounded-card p-5 mb-4 active:opacity-90"
    >
      <View className="flex-row items-start justify-between mb-2">
        <Text className="text-lg font-bold text-ink font-rubik flex-1">{name}</Text>
        <View className="bg-purple-bg rounded-full px-3 py-1 ms-2">
          <Text className="text-purple-ink text-sm font-bold font-rubik">
            {Math.round(score)}
          </Text>
        </View>
      </View>
      {bio ? (
        <Text className="text-sm text-ink-2 mb-3 leading-5" numberOfLines={2}>
          {bio}
        </Text>
      ) : null}
      <View className="flex-row items-start gap-1 bg-teal/10 rounded-lg p-2 mb-3">
        <Ionicons name="sparkles" size={14} color="#0F6E56" className="mt-0.5" />
        <Text className="text-xs text-teal font-medium flex-1 leading-5">{matchReason}</Text>
      </View>
      <View className="flex-row gap-4">
        <Text className="text-xs text-ink-2">{distanceLabel}</Text>
        {ratingAvg > 0 ? (
          <Text className="text-xs text-ink-2">
            ★ {ratingAvg.toFixed(1)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
