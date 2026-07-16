import { useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, Text, View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

import { TextField } from "@/components/ui/Screen";
import { AppLogo } from "@/components/ui/AppLogo";
import { fetchProfile, isProfileComplete, sendPhoneOtp, signInWithEmail } from "@/lib/auth-api";
import { hasStaffProfileRole, staffHomeHref } from "@/lib/staff-auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { isValidIsraeliPhone } from "@/lib/phone";
import { changeAppLanguage } from "@/i18n";
import { useLocaleStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { AppPageWidth } from "@/components/ui/AppPageWidth";

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { language, setLanguage } = useLocaleStore();
  const { selectedRole, pendingPhone, setPendingPhone } = useOnboardingStore();
  
  // States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState(pendingPhone || "");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [isPhoneMode, setIsPhoneMode] = useState(false);

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

  async function handleEmailLogin() {
    if (!selectedRole) return router.replace("/(auth)/role-select");
    if (!isSupabaseConfigured) return Alert.alert(t("common.error"), t("auth.supabaseMissing"));
    if (!email.includes("@")) return setError(t("auth.invalidEmail"));
    if (password.length < 6) return setError(t("auth.invalidPassword"));

    setError(undefined);
    setLoading(true);
    try {
      const session = await signInWithEmail(email, password);
      const profile = session?.user ? await fetchProfile(session.user.id) : null;
      if (profile && isProfileComplete(profile)) {
        if (hasStaffProfileRole(profile)) router.replace(staffHomeHref() as never);
        else if (profile.role === "parent") router.replace("/(parent)/(tabs)");
        else if (profile.role === "professional") router.replace("/(professional)");
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : t("auth.authFailed");
      Alert.alert(t("common.error"), raw.startsWith("auth.") ? t(raw) : raw);
    } finally {
      setLoading(false);
    }
  }

  async function handlePhoneLogin() {
    if (!selectedRole) return router.replace("/(auth)/role-select");
    if (!isSupabaseConfigured) return Alert.alert(t("common.error"), t("auth.supabaseMissing"));
    if (!isValidIsraeliPhone(phone)) return setError(t("auth.invalidPhone"));

    setError(undefined);
    setLoading(true);
    try {
      await sendPhoneOtp(phone, selectedRole!);
      setPendingPhone(phone);
      router.push("/(auth)/verify-otp");
    } catch (err) {
      const raw = err instanceof Error ? err.message : t("auth.authFailed");
      Alert.alert(t("common.error"), raw.startsWith("auth.") ? t(raw) : raw);
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    Alert.alert("Google Login", "Not yet configured in Supabase. Please use email or phone.");
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top", "bottom"]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1" contentContainerClassName="flex-grow">
          <AppPageWidth className="flex-grow px-6 py-4 flex flex-col items-center">
            
            {/* Header / Language */}
            <View className="w-full h-14 flex-row items-center justify-end">
              <Pressable 
                onPress={toggleLanguage}
                className="flex-row items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-full active:opacity-80"
              >
                <MaterialIcons name="language" size={18} color="#5F5C55" />
                <Text className="font-rubik-medium text-sm text-ink-2">
                  עברית / English
                </Text>
              </Pressable>
            </View>

            {/* Hero / Logo */}
            <View className="items-center mt-8 mb-10">
              <View className="w-48 h-48 mb-6 items-center justify-center">
                <AppLogo />
              </View>
              <Text className="font-rubik-bold text-2xl text-ink text-center">
                {t("auth.loginTitle", "התחברות לחשבון")}
              </Text>
            </View>

            {/* Form Section */}
            <View className="w-full space-y-6 max-w-sm w-full mx-auto">
              {isPhoneMode ? (
                <View className="mb-4">
                  <TextField
                    label={t("auth.phoneLabel", "מספר טלפון")}
                    placeholder={t("auth.phonePlaceholder", "05X-XXXXXXX")}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    error={error}
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                  />
                  <Pressable 
                    onPress={handlePhoneLogin}
                    disabled={loading}
                    className="w-full h-[52px] bg-purple rounded-[14px] items-center justify-center shadow-sm active:opacity-80 mt-2"
                  >
                    <Text className="text-white font-rubik-medium text-lg">
                      {loading ? "..." : t("auth.sendOtp", "שלח קוד אימות")}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View className="mb-4">
                  <TextField
                    label={t("auth.emailLabel", "אימייל")}
                    placeholder="example@email.com"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                  />
                  <View className="relative">
                    <TextField
                      label={t("auth.passwordLabel", "סיסמה")}
                      placeholder="********"
                      secureTextEntry
                      showPasswordToggle
                      value={password}
                      onChangeText={setPassword}
                      error={error}
                      autoComplete="password"
                      textContentType="password"
                    />
                  </View>
                  <Pressable onPress={() => router.push("/(auth)/forgot-password")} className="self-start mt-1 mb-4">
                    <Text className="text-purple font-rubik-medium text-sm hover:underline">
                      {t("auth.forgotPassword", "שכחת סיסמה?")}
                    </Text>
                  </Pressable>
                  
                  <Pressable 
                    onPress={handleEmailLogin}
                    disabled={loading}
                    className="w-full h-[52px] bg-purple rounded-[14px] items-center justify-center shadow-sm active:opacity-80"
                  >
                    <Text className="text-white font-rubik-medium text-lg">
                      {loading ? "..." : t("auth.loginButton", "התחברות")}
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Divider */}
              <View className="flex-row items-center gap-4 py-4 w-full max-w-sm mx-auto">
                <View className="h-[1px] flex-1 bg-border" />
                <Text className="font-rubik text-sm text-ink-3">או</Text>
                <View className="h-[1px] flex-1 bg-border" />
              </View>

              {/* Social / Alternate Logins */}
              <View className="gap-3 max-w-sm w-full mx-auto">
                <Pressable 
                  onPress={handleGoogleLogin}
                  className="w-full h-[52px] flex-row items-center justify-center gap-3 rounded-[14px] bg-white border border-border active:bg-surface-2 transition-colors"
                >
                  <MaterialIcons name="g-mobiledata" size={32} color="#DB4437" />
                  <Text className="font-rubik text-base text-ink">
                    {t("auth.loginGoogle", "התחברות עם גוגל")}
                  </Text>
                </Pressable>
                
                <Pressable 
                  onPress={() => setIsPhoneMode(!isPhoneMode)}
                  className="w-full h-[52px] flex-row items-center justify-center gap-3 rounded-[14px] bg-white border border-border active:bg-surface-2 transition-colors"
                >
                  <MaterialIcons name={isPhoneMode ? "email" : "smartphone"} size={24} color="#534AB7" />
                  <Text className="font-rubik text-base text-ink">
                    {isPhoneMode ? t("auth.loginMethodEmail", "התחברות עם אימייל") : t("auth.loginMethodPhone", "התחברות עם הודעת SMS")}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Footer */}
            <View className="mt-auto pt-10 text-center flex-row justify-center gap-1">
              <Text className="font-rubik text-base text-ink-2">
                {t("auth.noAccount", "אין לך חשבון?")}
              </Text>
              <Pressable onPress={() => router.replace("/(auth)/role-select")}>
                <Text className="text-purple font-rubik-bold text-base hover:underline">
                  {t("auth.signupButton", "הרשמה")}
                </Text>
              </Pressable>
            </View>

          </AppPageWidth>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
