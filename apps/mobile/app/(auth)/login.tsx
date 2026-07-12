import { useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, Text, View } from "react-native";

import {
  LanguageToggle,
  PrimaryButton,
  ScreenShell,
  TextField,
} from "@/components/ui/Screen";
import { sendPhoneOtp, signInWithEmail, signUpWithEmail } from "@/lib/auth-api";
import { isSupabaseConfigured } from "@/lib/supabase";
import { isValidIsraeliPhone } from "@/lib/phone";
import { changeAppLanguage } from "@/i18n";
import { useLocaleStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { language, setLanguage } = useLocaleStore();
  const { selectedRole, pendingPhone, setPendingPhone } = useOnboardingStore();
  
  const [loginMethod, setLoginMethod] = useState<"phone" | "email">("phone");
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [phone, setPhone] = useState(pendingPhone);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

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

  async function handleAction() {
    if (!selectedRole) {
      router.replace("/(auth)/role-select");
      return;
    }

    if (!isSupabaseConfigured) {
      Alert.alert(t("common.error"), t("auth.supabaseMissing"));
      return;
    }

    setError(undefined);
    setLoading(true);

    try {
      if (loginMethod === "phone") {
        if (!isValidIsraeliPhone(phone)) {
          setError(t("auth.invalidPhone"));
          setLoading(false);
          return;
        }
        await sendPhoneOtp(phone, selectedRole);
        setPendingPhone(phone);
        router.push("/(auth)/verify-otp");
      } else {
        if (!email.includes("@")) {
          setError(t("auth.invalidEmail"));
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError(t("auth.invalidPassword"));
          setLoading(false);
          return;
        }

        if (isSignUp) {
          await signUpWithEmail(email, password, selectedRole);
          // Auto sign-in or alert depending on confirm_email settings. Assuming auto-login:
          // The auth-store listener will catch the session and redirect.
          // Wait, if session is established, auth-store redirects to role root.
          // If the user hasn't completed onboarding, auth-store goes to onboarding.
        } else {
          await signInWithEmail(email, password);
        }
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : t("auth.authFailed");
      const message = raw.startsWith("auth.") ? t(raw) : raw;
      Alert.alert(t("common.error"), message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenShell
      eyebrow={t("auth.loginEyebrow")}
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      footer={
        <View className="pb-10">
          <PrimaryButton
            label={
              loginMethod === "phone"
                ? t("auth.sendOtp")
                : isSignUp
                  ? t("auth.signupButton")
                  : t("auth.loginButton")
            }
            onPress={handleAction}
            loading={loading}
          />
          {loginMethod === "email" && (
            <View className="items-center mt-4 gap-4">
              <Pressable onPress={() => setIsSignUp(!isSignUp)}>
                <Text className="text-purple text-base font-rubik">
                  {isSignUp ? t("auth.toggleLogin") : t("auth.toggleSignup")}
                </Text>
              </Pressable>
              {!isSignUp && (
                <Pressable onPress={() => router.push("/(auth)/forgot-password")}>
                  <Text className="text-purple/70 text-sm font-rubik">
                    {t("auth.forgotPassword")}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      }
    >
      <LanguageToggle
        language={language}
        label={t("common.language")}
        onToggle={toggleLanguage}
      />

      <Pressable onPress={() => router.replace("/(auth)/role-select")} className="mb-6">
        <Text className="text-sm text-purple font-medium font-rubik">
          {selectedRole === "parent"
            ? t("auth.roleParent")
            : selectedRole === "professional"
              ? t("auth.roleProfessional")
              : t("auth.roleSelectTitle")}{" "}
          · {t("common.back")}
        </Text>
      </Pressable>

      <View className="flex-row rounded-lg bg-surface border border-border p-1 mb-6">
        <Pressable
          onPress={() => setLoginMethod("phone")}
          className={`flex-1 py-2 items-center rounded-md ${
            loginMethod === "phone" ? "bg-white shadow-sm" : ""
          }`}
        >
          <Text
            className={`font-medium ${
              loginMethod === "phone" ? "text-purple" : "text-ink-2"
            }`}
          >
            {t("auth.loginMethodPhone")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setLoginMethod("email")}
          className={`flex-1 py-2 items-center rounded-md ${
            loginMethod === "email" ? "bg-white shadow-sm" : ""
          }`}
        >
          <Text
            className={`font-medium ${
              loginMethod === "email" ? "text-purple" : "text-ink-2"
            }`}
          >
            {t("auth.loginMethodEmail")}
          </Text>
        </Pressable>
      </View>

      {loginMethod === "phone" ? (
        <TextField
          label={t("auth.phoneLabel")}
          placeholder={t("auth.phonePlaceholder")}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          error={error}
          autoComplete="tel"
          textContentType="telephoneNumber"
        />
      ) : (
        <View className="gap-4">
          <TextField
            label={t("auth.emailLabel")}
            placeholder={t("auth.emailPlaceholder")}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <TextField
            label={t("auth.passwordLabel")}
            placeholder={t("auth.passwordPlaceholder")}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            error={error}
            autoComplete="password"
            textContentType="password"
          />
        </View>
      )}
    </ScreenShell>
  );
}
