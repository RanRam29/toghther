import { useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { GUIDE_STEPS, guideRole } from "@/lib/guide-content";

const PURPLE = "#534AB7";

interface UsageGuideProps {
  role: string | null | undefined;
  /** Called when the guide is closed. dontShowAgain = persist "don't show again". */
  onClose: (options: { dontShowAgain: boolean }) => void;
  /** Hide the "don't show again" control (e.g. when replayed from settings). */
  showDontShowAgain?: boolean;
}

export function UsageGuide({ role, onClose, showDontShowAgain = true }: UsageGuideProps) {
  const { t } = useTranslation();
  const gRole = guideRole(role);
  const steps = useMemo(() => GUIDE_STEPS[gRole] ?? [], [gRole]);

  const [index, setIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (steps.length === 0) return null;

  const step = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={() => onClose({ dontShowAgain })}>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-w-md bg-surface rounded-card border border-border p-6">
          {/* Skip (top-left in RTL) */}
          <Pressable
            onPress={() => onClose({ dontShowAgain })}
            hitSlop={12}
            className="self-start mb-2"
            accessibilityRole="button"
          >
            <Text className="text-sm text-ink-2 font-rubik">{t("guide.skip")}</Text>
          </Pressable>

          {/* Icon */}
          <View className="items-center mb-4">
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: "rgba(83,74,183,0.12)" }}
            >
              <Ionicons name={step.icon} size={30} color={PURPLE} />
            </View>
            <Text className="text-xl font-bold text-ink text-center font-rubik">
              {t(`guide.${gRole}.steps.${step.key}.title`)}
            </Text>
          </View>

          <Text className="text-base text-ink-2 text-center leading-6 font-rubik mb-6">
            {t(`guide.${gRole}.steps.${step.key}.body`)}
          </Text>

          {/* Progress dots */}
          <View className="flex-row-reverse items-center justify-center gap-2 mb-6">
            {steps.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === index ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === index ? PURPLE : "rgba(83,74,183,0.25)",
                }}
              />
            ))}
          </View>

          {/* "Don't show again" */}
          {showDontShowAgain && (
            <Pressable
              onPress={() => setDontShowAgain((v) => !v)}
              className="flex-row-reverse items-center justify-center gap-2 mb-4"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: dontShowAgain }}
            >
              <Ionicons
                name={dontShowAgain ? "checkbox" : "square-outline"}
                size={20}
                color={PURPLE}
              />
              <Text className="text-sm text-ink-2 font-rubik">{t("guide.dontShowAgain")}</Text>
            </Pressable>
          )}

          {/* Nav */}
          <View className="flex-row-reverse items-center gap-3">
            <Pressable
              onPress={() => (isLast ? onClose({ dontShowAgain }) : setIndex((i) => i + 1))}
              className="flex-1 bg-purple py-3 rounded-xl items-center"
              accessibilityRole="button"
            >
              <Text className="text-white font-bold text-base font-rubik">
                {isLast ? t("guide.done") : t("guide.next")}
              </Text>
            </Pressable>
            {index > 0 && (
              <Pressable
                onPress={() => setIndex((i) => i - 1)}
                className="px-4 py-3 rounded-xl items-center border border-border"
                accessibilityRole="button"
              >
                <Text className="text-ink-2 font-rubik">{t("guide.back")}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
