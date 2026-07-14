import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, View, Pressable, Text } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

import {
  LanguageToggle,
  PrimaryButton,
  RoleCard,
  ScreenShell,
} from "@/components/ui/Screen";
import { changeAppLanguage } from "@/i18n";
import type { UserRole } from "@/lib/types";
import { useLocaleStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";

export default function RoleSelectScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { language, setLanguage } = useLocaleStore();
  const { selectedRole, setSelectedRole } = useOnboardingStore();

  async function toggleLanguage() {
    const next = language === "he" ? "en" : "he";
    setLanguage(next);
    const needsReload = await changeAppLanguage(next);
    if (needsReload) {
      Alert.alert(
        t("common.language"),
        language === "he"
          ? "Restart the app to apply layout direction."
          : "הפעילו מחדש את האפליקציה כדי להחיל כיוון תצוגה."
      );
    }
  }

  function pickRole(role: UserRole) {
    setSelectedRole(role);
  }

  function continueToLogin() {
    if (!selectedRole) return;
    router.replace("/(auth)/login");
  }

  const videoSource = require("@/assets/videos/toghether.mp4");

  const player = useVideoPlayer(videoSource, player => {
    player.loop = true;
    player.play();
  });

  return (
    <ScreenShell
      hero={
        <View className="w-full mb-6 items-center justify-center">
          <VideoView 
            player={player} 
            style={{ width: "100%", aspectRatio: 16/9, maxHeight: 250, borderRadius: 16, overflow: "hidden" }} 
            contentFit="contain"
            nativeControls={false} 
          />
        </View>
      }
      eyebrow={t("auth.roleSelectEyebrow")}
      title={t("auth.roleSelectTitle")}
      subtitle={t("auth.roleSelectSubtitle")}
      footer={
        <View className="pb-10">
          <PrimaryButton
            label={t("common.continue")}
            onPress={continueToLogin}
            disabled={!selectedRole}
          />
          <Pressable 
            className="mt-6 self-center" 
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text className="text-purple font-medium text-sm font-rubik">
              {t("auth.backToLogin")}
            </Text>
          </Pressable>
        </View>
      }
    >
      <LanguageToggle
        language={language}
        label={t("common.language")}
        onToggle={toggleLanguage}
      />

      <RoleCard
        title={t("auth.roleParent")}
        description={t("auth.roleParentDesc")}
        selected={selectedRole === "parent"}
        onPress={() => pickRole("parent")}
      />
      <RoleCard
        title={t("auth.roleProfessional")}
        description={t("auth.roleProfessionalDesc")}
        selected={selectedRole === "professional"}
        onPress={() => pickRole("professional")}
      />
    </ScreenShell>
  );
}
