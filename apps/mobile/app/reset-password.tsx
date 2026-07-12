import { useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";

import {
  PrimaryButton,
  ScreenShell,
  TextField,
} from "@/components/ui/Screen";
import { updatePassword } from "@/lib/auth-api";

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleUpdate() {
    if (password.length < 6) {
      setError(t("auth.invalidPassword"));
      return;
    }

    setError(undefined);
    setLoading(true);

    try {
      await updatePassword(password);
      Alert.alert("Success", t("auth.passwordUpdated"));
      router.replace("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.authFailed");
      Alert.alert(t("common.error"), message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenShell
      title={t("auth.updatePasswordTitle")}
      subtitle={t("auth.updatePasswordSubtitle")}
      footer={
        <View className="pb-10">
          <PrimaryButton
            label={t("auth.updatePasswordButton")}
            onPress={handleUpdate}
            loading={loading}
          />
        </View>
      }
    >
      <View className="mt-4">
        <TextField
          label={t("auth.passwordLabel")}
          placeholder={t("auth.passwordPlaceholder")}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          error={error}
          autoComplete="password"
          textContentType="newPassword"
        />
      </View>
    </ScreenShell>
  );
}
