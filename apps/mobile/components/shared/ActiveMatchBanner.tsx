import { Pressable, Text, View } from "react-native";

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
  return (
    <Pressable
      onPress={onPress}
      className="bg-teal rounded-card p-5 mb-6 active:opacity-90"
    >
      <Text className="text-xs font-bold uppercase tracking-widest text-teal-bg mb-1">
        {title}
      </Text>
      <Text className="text-lg font-bold text-white font-rubik mb-2">
        {subtitle}
      </Text>
      <View className="self-start bg-white/20 rounded-full px-3 py-1">
        <Text className="text-white text-sm font-semibold font-rubik">
          {actionLabel} →
        </Text>
      </View>
    </Pressable>
  );
}
