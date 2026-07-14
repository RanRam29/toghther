import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { BackButton } from "@/components/ui/BackButton";
import { UsageGuide } from "@/components/guide/UsageGuide";
import { GUIDE_STEPS, guideRole } from "@/lib/guide-content";
import { useAuthStore } from "@/stores/auth-store";

const PURPLE = "#534AB7";

export default function HowToUseScreen() {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const gRole = guideRole(profile?.role);
  const steps = GUIDE_STEPS[gRole] ?? [];
  const [replay, setReplay] = useState(false);

  return (
    <View className="flex-1 bg-bg">
      <ScrollView className="flex-1 px-5 pt-14" contentContainerStyle={{ paddingBottom: 32 }}>
        <BackButton className="self-end" />

        <Text className="text-2xl font-bold text-ink mb-2 font-rubik text-start">
          {t("guide.howToTitle")}
        </Text>
        <Text className="text-base text-ink-2 mb-6 font-rubik text-start">
          {t(`guide.${gRole}.intro`)}
        </Text>

        {steps.map((step, i) => (
          <View
            key={step.key}
            className="bg-surface rounded-card border border-border p-4 mb-3 flex-row-reverse items-start gap-3"
          >
            <View
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{ backgroundColor: "rgba(83,74,183,0.12)" }}
            >
              <Ionicons name={step.icon} size={22} color={PURPLE} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-ink text-start font-rubik mb-1">
                {i + 1}. {t(`guide.${gRole}.steps.${step.key}.title`)}
              </Text>
              <Text className="text-sm text-ink-2 text-start leading-5 font-rubik">
                {t(`guide.${gRole}.steps.${step.key}.body`)}
              </Text>
            </View>
          </View>
        ))}

        <Pressable
          onPress={() => setReplay(true)}
          className="bg-purple py-3 rounded-xl items-center mt-4 flex-row-reverse justify-center gap-2"
        >
          <Ionicons name="play-circle-outline" size={20} color="#fff" />
          <Text className="text-white font-bold text-base font-rubik">{t("guide.replay")}</Text>
        </Pressable>
      </ScrollView>

      {replay && (
        <UsageGuide role={profile?.role} showDontShowAgain={false} onClose={() => setReplay(false)} />
      )}
    </View>
  );
}
