import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";

import { ScreenShell } from "@/components/ui/Screen";
import { LanguageToggle } from "@/components/ui/Form";
import { changeAppLanguage } from "@/i18n";
import { useAuthStore, useLocaleStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase";
import { getStoredPushToken, removePushToken } from "@/lib/push-notifications";
import { useNotificationPrefs, useUpdateNotificationPrefs } from "@/hooks/useSettings";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const reset = useAuthStore((s) => s.reset);
  const language = useLocaleStore((s) => s.language);
  const setLanguage = useLocaleStore((s) => s.setLanguage);
  const userId = session?.user?.id;

  const { data: prefs, isLoading } = useNotificationPrefs(userId);
  const updatePrefs = useUpdateNotificationPrefs(userId);
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  async function handleLogout() {
    Alert.alert(t("settings.logoutTitle"), t("settings.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.logoutAction"),
        style: "destructive",
        onPress: async () => {
          const token = getStoredPushToken();
          if (userId && token) {
            await removePushToken(userId, token);
          }

          await supabase.auth.signOut();
          reset();
          router.replace("/");
        },
      },
    ]);
  }

  function togglePref(key: "checkin" | "daily_summary", value: boolean) {
    updatePrefs.mutate({ [key]: value });
  }

  return (
    <ScreenShell title={t("settings.title")}>
      <Pressable onPress={() => router.back()} className="mb-4 self-start">
        <Text className="text-purple font-medium font-rubik">{t("common.back")}</Text>
      </Pressable>
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        <View className="bg-surface rounded-card border border-border p-4 mb-6">
          <LanguageToggle
            language={language}
            label={t("settings.languageLabel")}
            onToggle={async () => {
              const next = language === "he" ? "en" : "he";
              setLanguage(next);
              await changeAppLanguage(next);
            }}
          />
        </View>

        <View className="bg-surface rounded-card border border-border p-4 mb-6">
          <Text className="text-lg font-bold text-ink mb-4 font-rubik text-right">
            {t("settings.pushTitle")}
          </Text>

          {isLoading ? (
            <ActivityIndicator size="small" color="#534AB7" />
          ) : (
            <>
              <View className="flex-row items-center justify-between mb-4 border-b border-border/50 pb-4">
                <Switch
                  value={prefs?.checkin ?? true}
                  onValueChange={(val) => togglePref("checkin", val)}
                  trackColor={{ false: "#E5E2DA", true: "#534AB7" }}
                  thumbColor="#FFFFFF"
                />
                <View className="flex-1 ms-3">
                  <Text className="text-base font-semibold text-ink text-right">
                    {t("settings.checkinLabel")}
                  </Text>
                  <Text className="text-sm text-ink-2 text-right">
                    {t("settings.checkinDesc")}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between">
                <Switch
                  value={prefs?.daily_summary ?? true}
                  onValueChange={(val) => togglePref("daily_summary", val)}
                  trackColor={{ false: "#E5E2DA", true: "#534AB7" }}
                  thumbColor="#FFFFFF"
                />
                <View className="flex-1 ms-3">
                  <Text className="text-base font-semibold text-ink text-right">
                    {t("settings.dailySummaryLabel")}
                  </Text>
                  <Text className="text-sm text-ink-2 text-right">
                    {t("settings.dailySummaryDesc")}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        <View className="bg-surface rounded-card border border-border p-4 mb-6">
          <Text className="text-lg font-bold text-ink mb-4 font-rubik text-right">
            {t("settings.legalTitle")}
          </Text>
          <Pressable
            onPress={() => router.push("/legal/privacy" as never)}
            className="py-3 border-b border-border/50"
          >
            <Text className="text-base text-purple text-right font-rubik">
              {t("legal.privacyTitle")}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push("/legal/terms" as never)} className="py-3">
            <Text className="text-base text-purple text-right font-rubik">
              {t("legal.termsTitle")}
            </Text>
          </Pressable>
        </View>

        <Text className="text-xs text-ink-2 text-center mb-4">
          {t("settings.version", { version: appVersion })}
        </Text>

        <Pressable
          onPress={handleLogout}
          className="bg-coral/10 p-4 rounded-xl flex-row items-center justify-center gap-2 mt-4"
        >
          <Ionicons name="log-out-outline" size={20} color="#E04D40" />
          <Text className="text-coral font-bold text-base">{t("settings.logoutAction")}</Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}
