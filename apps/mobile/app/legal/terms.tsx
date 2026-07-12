import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text } from "react-native";

import { ScreenShell } from "@/components/ui/Screen";

export default function TermsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ScreenShell title={t("legal.termsTitle")}>
      <Pressable onPress={() => router.back()} className="mb-4 self-start">
        <Text className="text-purple font-medium font-rubik">{t("common.back")}</Text>
      </Pressable>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Text className="text-sm text-ink-2 leading-6 text-right mb-4">
          {t("legal.termsBeta")}
        </Text>
        <Text className="text-sm text-ink leading-6 text-right mb-4">
          {t("legal.termsBody")}
        </Text>
        <Text className="text-xs text-ink-2 text-right">{t("legal.contact")}</Text>
      </ScrollView>
    </ScreenShell>
  );
}
