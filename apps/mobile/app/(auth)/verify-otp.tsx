import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, Text, View } from "react-native";

import {
  OtpInput,
  PrimaryButton,
  ScreenShell,
} from "@/components/ui/Screen";
import { fetchProfile, sendPhoneOtp, verifyPhoneOtp } from "@/lib/auth-api";
import { AnalyticsEvents } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";

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
    <ScreenShell
      eyebrow={t("auth.verifyEyebrow")}
      title={t("auth.verifyTitle")}
      subtitle={t("auth.verifySubtitle", { phone: pendingPhone })}
      footer={
        <View className="pb-10 gap-3">
          <PrimaryButton
            label={t("auth.verifyOtp")}
            onPress={handleVerify}
            loading={loading}
          />
          <Pressable onPress={handleResend} disabled={resending} className="py-2">
            <Text className="text-center text-purple font-medium font-rubik">
              {t("auth.resendOtp")}
            </Text>
          </Pressable>
        </View>
      }
    >
      <OtpInput value={otp} onChange={setOtp} />

      <Pressable onPress={() => router.replace("/(auth)/login")} className="py-2">
        <Text className="text-center text-ink-2">{t("auth.changePhone")}</Text>
      </Pressable>
    </ScreenShell>
  );
}
