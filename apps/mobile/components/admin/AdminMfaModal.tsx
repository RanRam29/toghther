import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  enrollTotpFactor,
  getAdminAssuranceLevel,
  listMfaFactors,
  verifyTotpChallenge,
} from "@/lib/admin-mfa";

interface AdminMfaModalProps {
  visible: boolean;
  onClose: () => void;
  onVerified: () => void;
}

export function AdminMfaModal({ visible, onClose, onVerified }: AdminMfaModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setCode("");

    async function init() {
      try {
        const factors = await listMfaFactors();
        const totp = factors.totp?.[0];
        if (totp) {
          if (!cancelled) setFactorId(totp.id);
          return;
        }

        const enrolled = await enrollTotpFactor();
        if (!cancelled) {
          setFactorId(enrolled.id);
          setQrCode(enrolled.totp?.qr_code ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("staff.mfaError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [visible, t]);

  async function handleVerify() {
    if (!factorId || code.length < 6) return;
    setVerifying(true);
    setError(null);
    try {
      await verifyTotpChallenge(factorId, code);
      const { currentLevel } = await getAdminAssuranceLevel();
      if (currentLevel === "aal2") {
        onVerified();
        onClose();
      } else {
        setError(t("staff.mfaStillRequired"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("staff.mfaError"));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-surface rounded-card p-6 w-full max-w-md">
          <Text className="text-xl font-bold text-ink mb-2 font-rubik text-right">
            {t("staff.mfaTitle")}
          </Text>
          <Text className="text-sm text-ink-2 mb-4 text-right leading-5">
            {qrCode ? t("staff.mfaEnrollHint") : t("staff.mfaVerifyHint")}
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color="#534AB7" />
          ) : (
            <>
              {qrCode ? (
                <Image
                  source={{ uri: qrCode }}
                  className="w-48 h-48 self-center mb-4"
                  resizeMode="contain"
                />
              ) : null}

              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder={t("staff.mfaCodePlaceholder")}
                placeholderTextColor="#918D84"
                keyboardType="number-pad"
                maxLength={6}
                className="bg-bg border border-border rounded-card px-4 py-3 text-ink text-center text-lg tracking-widest mb-4"
              />

              {error ? (
                <Text className="text-coral text-sm text-right mb-3">{error}</Text>
              ) : null}

              <View className="flex-row gap-3 justify-end">
                <Pressable onPress={onClose} className="px-4 py-3">
                  <Text className="text-ink-2 font-rubik">{t("common.cancel")}</Text>
                </Pressable>
                <Pressable
                  onPress={handleVerify}
                  disabled={verifying || code.length < 6}
                  className="bg-purple rounded-card px-6 py-3 active:opacity-90"
                >
                  <Text className="text-white font-semibold font-rubik">
                    {verifying ? "…" : t("staff.mfaVerify")}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
