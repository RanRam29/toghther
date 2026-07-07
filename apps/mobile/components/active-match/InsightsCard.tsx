import { Text, View } from "react-native";

import { MoodBadge } from "./MoodPicker";

interface InsightsCardProps {
  title: string;
  emptyLabel: string;
  content: string | null | undefined;
  variant?: "purple" | "teal";
}

export function InsightsCard({
  title,
  emptyLabel,
  content,
  variant = "purple",
}: InsightsCardProps) {
  const bgClass = variant === "teal" ? "bg-teal-bg" : "bg-purple-bg";
  const borderClass = variant === "teal" ? "border-teal" : "border-purple";
  const inkClass = variant === "teal" ? "text-teal-ink" : "text-purple-ink";

  return (
    <View className={`rounded-card p-5 mb-4 border ${bgClass} ${borderClass}`}>
      <Text className={`text-xs font-bold uppercase tracking-widest mb-2 ${inkClass}`}>
        {title}
      </Text>
      {content ? (
        <Text className="text-base text-ink leading-6">{content}</Text>
      ) : (
        <Text className="text-sm text-ink-2 leading-5">{emptyLabel}</Text>
      )}
    </View>
  );
}

interface DailyLogRowProps {
  dateLabel: string;
  mood: number;
  notes: string;
}

export function DailyLogRow({ dateLabel, mood, notes }: DailyLogRowProps) {
  return (
    <View className="bg-surface border border-border rounded-card p-4 mb-3 flex-row items-start gap-3">
      <MoodBadge value={mood} />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-ink font-rubik">{dateLabel}</Text>
        {notes ? (
          <Text className="text-sm text-ink-2 mt-1 leading-5" numberOfLines={3}>
            {notes}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
