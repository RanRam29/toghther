import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { isAppRtl, webPressableClass } from "@/lib/platform";

interface ActiveMatchBannerProps {
  title: string;
  subtitle: string;
  actionLabel: string;
  onPress: () => void;
}

export function ActiveMatchBanner({
  title,
  subtitle,
  actionLabel,
  onPress,
}: ActiveMatchBannerProps) {
  const chevron = isAppRtl() ? "chevron-back" : "chevron-forward";

  return (
    <View className="bg-teal rounded-card p-5 mb-6">
      <Text className="text-xs font-bold uppercase tracking-widest text-teal-bg mb-1 text-start font-rubik">
        {title}
      </Text>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-white font-rubik text-start">{subtitle}</Text>
        </View>
        <Pressable
          onPress={onPress}
          className={`shrink-0 bg-white/20 rounded-full px-4 py-2 active:opacity-90 flex-row items-center gap-1 ${webPressableClass}`}
          accessibilityRole="button"
        >
          <Text className="text-white text-sm font-semibold font-rubik">{actionLabel}</Text>
          <Ionicons name={chevron} size={16} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}
