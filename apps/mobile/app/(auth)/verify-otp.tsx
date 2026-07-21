import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, Text, View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

import { OtpInput } from "@/components/ui/Screen";
import { AppLogo } from "@/components/ui/AppLogo";
import { fetchProfile, isProfileComplete, sendPhoneOtp, verifyPhoneOtp } from "@/lib/auth-api";
import { hasStaffProfileRole, staffHomeHref } from "@/lib/staff-auth";
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
  const [error, setError] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(30);
  const lastAttempt = useRef<string | null>(null);

  useEffect(() => {
    // דרוש רק מספר טלפון ממתין — התפקיד קיים בהרשמה בלבד, ולא בהתחברות
    if (!pendingPhone) {
      router.replace("/(auth)/login");
    }
  }, [pendingPhone, router]);

  // Resend cooldown countdown — S-AUTH-02 / AUTH-SPEC §2 (30s UI cooldown)
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Auto-submit once 6 digits are entered — S-AUTH-02
  useEffect(() => {
    if (otp.length < 6 && error) setError(undefined);
    if (otp.length === 6 && !loading && otp !== lastAttempt.current) {
      void handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  if (!pendingPhone) {
    return null;
  }

  async function handleVerify() {
    if (otp.length !== 6) return;

    if (!isSupabaseConfigured) {
      Alert.alert(t("common.error"), t("auth.supabaseMissing"));
      return;
    }

    lastAttempt.current = otp;
    setError(undefined);
    setLoading(true);
    try {
      const session = await verifyPhoneOtp(pendingPhone, otp);
      setSession(session);

      void track(AnalyticsEvents.SIGNUP_COMPLETED, { role: selectedRole ?? "unknown" });

      const profile = session?.user ? await fetchProfile(session.user.id) : null;
      if (profile) setProfile(profile);

      // משתמש קיים שהשלים פרופיל — לבית שלו; אחרת (הרשמה/פרטים חסרים) — להשלמה
      if (profile && isProfileComplete(profile)) {
        if (hasStaffProfileRole(profile)) router.replace(staffHomeHref() as never);
        else if (profile.role === "parent") router.replace("/(parent)/(tabs)");
        else if (profile.role === "professional") router.replace("/(professional)");
        else router.replace("/(auth)/onboarding");
      } else {
        router.replace("/(auth)/onboarding");
      }
    } catch {
      // Spec S-AUTH-02 error copy — אחיד, בלי לחשוף אם המספר קיים (user enumeration)
      setError(t("auth.otpMismatch", "הקוד לא תואם — ננסה שוב?"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;

    setResending(true);
    setError(undefined);
    try {
      // שולחים מחדש עם אותה כוונה: הרשמה יוצרת משתמש, התחברות חוסמת יצירה
      await sendPhoneOtp(pendingPhone, selectedRole ?? "parent", {
        shouldCreateUser: !!selectedRole,
      });
      setOtp("");
      lastAttempt.current = null;
      setCooldown(30);
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
                {error ? (
                  <Text className="mt-3 text-center font-rubik text-sm text-coral">
                    {error}
                  </Text>
                ) : null}
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
                disabled={resending || cooldown > 0}
                className="py-4 items-center flex-row justify-center"
              >
                <Text className="text-ink-2 font-rubik text-base">
                  לא קיבלת קוד?{" "}
                </Text>
                <Text
                  className={`font-rubik-bold text-base ${
                    cooldown > 0 ? "text-ink-3" : "text-purple active:opacity-70"
                  }`}
                >
                  {cooldown > 0 ? `שלח שוב (${cooldown})` : "שלח שוב"}
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
