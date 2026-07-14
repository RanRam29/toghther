import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { AnimatedEntrance } from "@/components/ui/AnimatedEntrance";
import { formatMatchReason } from "@/lib/format-match-reason";
import {
  cardEntering,
  lightHaptic,
  PRESS_SCALE,
  shouldAnimatePress,
} from "@/lib/motion";
import { webPressableClass } from "@/lib/platform";
import type { Child } from "@/lib/types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ChildSelectorProps {
  children: Child[];
  selectedId: string | null;
  onSelect: (childId: string) => void;
  addLabel?: string;
  onAdd?: () => void;
}

function ChildChip({
  label,
  selected,
  onPress,
  dashed,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  dashed?: boolean;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    if (!shouldAnimatePress()) return;
    scale.value = withSpring(PRESS_SCALE, { damping: 20, stiffness: 400 });
  }

  function handlePressOut() {
    if (!shouldAnimatePress()) return;
    scale.value = withSpring(1, { damping: 16, stiffness: 320 });
  }

  const chipClass = `shrink-0 rounded-full px-5 py-2.5 border active:opacity-90 ${webPressableClass} ${
    dashed
      ? "border-dashed border-purple bg-purple-bg"
      : selected
        ? "bg-purple border-purple"
        : "bg-surface border-border"
  }`;

  const labelClass = `text-sm font-semibold font-rubik whitespace-nowrap ${
    dashed ? "text-purple-ink" : selected ? "text-white" : "text-ink"
  }`;

  if (!shouldAnimatePress()) {
    return (
      <Pressable
        onPress={() => {
          lightHaptic();
          onPress();
        }}
        className={chipClass}
      >
        <Text className={labelClass}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={() => {
        lightHaptic();
        onPress();
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={animatedStyle}
      className={chipClass}
    >
      <Text className={labelClass}>{label}</Text>
    </AnimatedPressable>
  );
}

export function ChildSelector({
  children,
  selectedId,
  onSelect,
  addLabel,
  onAdd,
}: ChildSelectorProps) {
  const chips = (
    <>
      {children.map((child) => {
        const selected = child.id === selectedId;
        return (
          <ChildChip
            key={child.id}
            label={child.first_name}
            selected={selected}
            onPress={() => onSelect(child.id)}
          />
        );
      })}
      {onAdd && addLabel ? (
        <ChildChip label={`+ ${addLabel}`} dashed onPress={onAdd} />
      ) : null}
    </>
  );

  if (Platform.OS === "web") {
    return (
      <View className="flex-row flex-wrap gap-2 mb-6 justify-start">{chips}</View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-6 grow-0 shrink-0"
      style={{ flexGrow: 0, flexShrink: 0, maxHeight: 48 }}
      contentContainerStyle={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 4,
      }}
    >
      {chips}
    </ScrollView>
  );
}

function matchQualityLabel(score: number, t: (key: string) => string): string {
  if (score >= 80) return t("parent.matchQualityHigh");
  if (score >= 60) return t("parent.matchQualityGood");
  return t("parent.matchQualityFair");
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
  index?: number;
}

export function MatchCard({
  name,
  bio,
  matchReason,
  score,
  ratingAvg,
  distanceLabel,
  onPress,
  index = 0,
}: MatchCardProps) {
  const { t } = useTranslation();
  const reason = formatMatchReason(matchReason, t);
  const qualityLabel = matchQualityLabel(score, t);
  const scale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    if (!shouldAnimatePress()) return;
    scale.value = withSpring(PRESS_SCALE, { damping: 20, stiffness: 400 });
  }

  function handlePressOut() {
    if (!shouldAnimatePress()) return;
    scale.value = withSpring(1, { damping: 16, stiffness: 320 });
  }

  const cardBody = (
    <Pressable
      onPress={() => {
        lightHaptic();
        onPress?.();
      }}
      onPressIn={shouldAnimatePress() ? handlePressIn : undefined}
      onPressOut={shouldAnimatePress() ? handlePressOut : undefined}
      className={`bg-surface border border-border rounded-card p-5 mb-4 active:opacity-90 w-full ${webPressableClass}`}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="w-12 h-12 rounded-full bg-purple-bg items-center justify-center me-3 shrink-0">
          <Text className="text-purple-ink font-bold font-rubik text-base">
            {name.slice(0, 2)}
          </Text>
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-lg font-bold text-ink font-rubik text-start">{name}</Text>
          {bio ? (
            <Text className="text-sm text-ink-2 mt-1 leading-5 text-start" numberOfLines={2}>
              {bio}
            </Text>
          ) : null}
        </View>
        <View className="bg-purple-bg rounded-full px-3 py-1 ms-2 shrink-0">
          <Text className="text-purple-ink text-xs font-bold font-rubik">{qualityLabel}</Text>
        </View>
      </View>

      <View className="flex-row items-start gap-1 bg-teal/10 rounded-lg p-2 mb-3">
        <Text className="text-xs text-teal font-medium flex-1 leading-5 text-start">
          {reason}
        </Text>
      </View>

      <View className="flex-row gap-4 justify-start">
        <Text className="text-xs text-ink-2">{distanceLabel}</Text>
        {ratingAvg > 0 ? (
          <Text className="text-xs text-ink-2">★ {ratingAvg.toFixed(1)}</Text>
        ) : null}
      </View>
    </Pressable>
  );

  if (!shouldAnimatePress()) {
    return (
      <AnimatedEntrance entering={cardEntering(index)} className="w-full">
        {cardBody}
      </AnimatedEntrance>
    );
  }

  return (
    <AnimatedEntrance entering={cardEntering(index)} style={pressStyle} className="w-full">
      {cardBody}
    </AnimatedEntrance>
  );
}
