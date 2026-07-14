import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import Animated, { type AnimatedProps } from "react-native-reanimated";

import { supportsLayoutAnimations } from "@/lib/platform";

type Entering = AnimatedProps<View>["entering"];

interface AnimatedEntranceProps extends ViewProps {
  children: ReactNode;
  entering?: Entering;
  className?: string;
}

/**
 * Wraps content with Reanimated entering on iOS/Android.
 * On web, renders a plain View — layout animations are skipped for compatibility.
 */
export function AnimatedEntrance({
  children,
  entering,
  className,
  style,
  ...rest
}: AnimatedEntranceProps) {
  if (!supportsLayoutAnimations || !entering) {
    return (
      <View className={className} style={style} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <Animated.View entering={entering} className={className} style={style} {...rest}>
      {children}
    </Animated.View>
  );
}
