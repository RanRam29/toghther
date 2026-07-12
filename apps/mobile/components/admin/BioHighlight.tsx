import { Text, View } from "react-native";

import { highlightBioContactPatterns } from "@/lib/admin-verification";

interface BioHighlightProps {
  bio: string | null | undefined;
  emptyLabel: string;
}

export function BioHighlight({ bio, emptyLabel }: BioHighlightProps) {
  if (!bio?.trim()) {
    return (
      <Text className="text-sm text-ink-2 text-right leading-6">{emptyLabel}</Text>
    );
  }

  const segments = highlightBioContactPatterns(bio);

  return (
    <Text className="text-sm text-ink text-right leading-6">
      {segments.map((segment, index) => (
        <Text
          key={`${index}-${segment.text.slice(0, 8)}`}
          className={
            segment.flagged
              ? "bg-coral-bg text-coral font-semibold"
              : "text-ink"
          }
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}

interface BioWarningProps {
  message: string;
}

export function BioWarning({ message }: BioWarningProps) {
  return (
    <View className="bg-coral-bg border border-coral rounded-card px-3 py-2 mt-2">
      <Text className="text-sm text-coral text-right">{message}</Text>
    </View>
  );
}
