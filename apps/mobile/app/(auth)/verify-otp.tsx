import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, Text, View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

import { OtpInput } from "@/components/ui/Screen";
import { AppLogo } from "@/components/ui/AppLogo";
import { fetchProfile, sendPhoneOtp, verifyPhoneOtp } from "@/lib/auth-api";
import { AnalyticsEvents } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { AppPageWidth } from "@/components/ui/AppPageWidth";

export default function VerifyOtpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { pendingPhone, selectedRole } = useOnboardingStore();
  const { setSession, setProfile } = useAuthStore();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!pendingPhone || !selectedRole) {
      router.replace("/(auth)/login");
    }
  }, [pendingPhone, selectedRole, router]);

  if (!pendingPhone || !selectedRole) {
    return null;
  }

  async function handleVerify() {
    if (otp.length !== 6) {
      Alert.alert(t("common.error"), t("auth.otpRequired"));
      return;
    }

    if (!isSupabaseConfigured) {
      Alert.alert(t("common.error"), t("auth.supabaseMissing"));
      return;
    }

    setLoading(true);
    try {
      const session = await verifyPhoneOtp(pendingPhone, otp);
      setSession(session);

      void track(AnalyticsEvents.SIGNUP_COMPLETED, { role: selectedRole ?? "unknown" });

      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setProfile(profile);
      }

      router.replace("/(auth)/onboarding");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.authFailed");
      Alert.alert(t("common.error"), message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!selectedRole) return;

    setResending(true);
    try {
      await sendPhoneOtp(pendingPhone, selectedRole);
      Alert.alert(t("auth.verifyEyebrow"), t("auth.resendOtp"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.authFailed");
      Alert.alert(t("common.error"), message);
    } finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top", "bottom"]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1" contentContainerClassName="flex-grow">
          <AppPageWidth className="flex-grow px-6 py-4 flex flex-col items-center">
            
            {/* Header */}
            <View className="w-full h-14 flex-row items-center justify-between mb-8">
              <Pressable 
                onPress={() => router.back()}
                className="p-2 active:opacity-70 rounded-full bg-surface-2"
              >
                <MaterialIcons name="arrow-back" size={24} color="#3C3489" />
              </Pressable>
              <View className="h-8 justify-center">
                <AppLogo variant="compact" />
              </View>
              <View className="w-10" />
            </View>

            {/* Title */}
            <View className="items-center mb-10 text-center">
              <Text className="font-rubik-bold text-2xl text-ink mb-4 text-center">
                {t("auth.verifyTitle", "אימות קוד")}
              </Text>
              <Text className="font-rubik text-base text-ink-2 text-center leading-relaxed max-w-[300px]">
                {t("auth.verifySubtitle", `שלחנו קוד בן 6 ספרות למספר הטלפון ${pendingPhone}. אנא הזינו אותו למטה כדי להמשיך.`)}
              </Text>
            </View>

            {/* OTP Form */}
            <View className="w-full space-y-6 max-w-sm w-full mx-auto">
              <View className="mb-8">
                <OtpInput value={otp} onChange={setOtp} />
              </View>

              <Pressable 
                onPress={handleVerify}
                disabled={loading || otp.length !== 6}
                className={`w-full h-[52px] rounded-[14px] items-center justify-center shadow-sm active:opacity-80 transition-opacity ${
                  otp.length === 6 ? "bg-purple" : "bg-purple/50"
                }`}
              >
                <Text className="text-white font-rubik-medium text-lg">
                  {loading ? "..." : t("auth.verifyOtp", "אימות")}
                </Text>
              </Pressable>

              <Pressable 
                onPress={handleResend}
                disabled={resending}
                className="py-4 items-center flex-row justify-center"
              >
                <Text className="text-ink-2 font-rubik text-base">
                  לא קיבלת קוד?{" "}
                </Text>
                <Text className="text-purple font-rubik-bold text-base active:opacity-70">
                  שלח שוב
                </Text>
              </Pressable>
            </View>

            {/* Footer */}
            <View className="mt-auto pt-10">
              <Pressable onPress={() => router.replace("/(auth)/login")} className="py-2">
                <Text className="text-center text-ink-3 font-rubik">
                  {t("auth.changePhone", "החלף מספר טלפון")}
                </Text>
              </Pressable>
            </View>

          </AppPageWidth>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
