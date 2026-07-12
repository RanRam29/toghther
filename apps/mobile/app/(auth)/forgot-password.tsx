import { useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, View, Pressable, Text } from "react-native";

import {
  PrimaryButton,
  ScreenShell,
  TextField,
} from "@/components/ui/Screen";
import { requestPasswordReset } from "@/lib/auth-api";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!email.includes("@")) {
      setError(t("auth.invalidEmail"));
      return;
    }

    setError(undefined);
    setLoading(true);

    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.authFailed");
      Alert.alert(t("common.error"), message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenShell
      title={t("auth.resetPasswordTitle")}
      subtitle={t("auth.resetPasswordSubtitle")}
      footer={
        <View className="pb-10 gap-4">
          {!sent && (
            <PrimaryButton
              label={t("auth.sendResetLink")}
              onPress={handleSend}
              loading={loading}
            />
          )}
          <Pressable onPress={() => router.back()} className="py-2 items-center">
            <Text className="text-purple font-medium text-base font-rubik">
              {t("auth.backToLogin")}
            </Text>
          </Pressable>
        </View>
      }
    >
      {sent ? (
        <View className="bg-green-50 p-4 rounded-xl border border-green-200 mt-4">
          <Text className="text-green-800 text-center font-medium font-rubik">
            {t("auth.resetEmailSent")}
          </Text>
        </View>
      ) : (
        <View className="mt-4">
          <TextField
            label={t("auth.emailLabel")}
            placeholder={t("auth.emailPlaceholder")}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            error={error}
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
        </View>
      )}
    </ScreenShell>
  );
}
