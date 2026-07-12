import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";

import { AdminMfaModal } from "@/components/admin/AdminMfaModal";
import { StaffQueryFeedback } from "@/components/admin/StaffQueryFeedback";
import { PrimaryButton } from "@/components/ui/Screen";
import { useStaffRoute } from "@/hooks/useStaffRoute";
import { useAdminMfa } from "@/hooks/useAdminMfa";
import {
  useMetricCatalog,
  useSetSystemConfig,
  useSystemConfig,
  useUpdateMetricCatalog,
} from "@/hooks/useAdminConfig";
import { CONFIG_KEYS, type ConfigKey } from "@/lib/api/admin-config";

function configValueToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parseConfigValue(key: ConfigKey, raw: string): unknown {
  if (key === "launch_city") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  const num = Number(raw);
  return Number.isFinite(num) ? num : raw;
}

type MetricDraft = {
  heLabel: string;
  enLabel: string;
  isCore: boolean;
};

export default function AdminConfigScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAdmin, isReady } = useStaffRoute();
  const mfa = useAdminMfa(isAdmin);
  const {
    data: rows = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useSystemConfig();
  const metricCatalog = useMetricCatalog();
  const setConfig = useSetSystemConfig();
  const updateMetric = useUpdateMetricCatalog();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [metricDraft, setMetricDraft] = useState<Record<string, MetricDraft>>(
    {},
  );
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (isReady && !isAdmin) {
      router.replace("/(staff)/verification" as never);
    }
  }, [isReady, isAdmin, router]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const key of CONFIG_KEYS) {
      const row = rows.find((r) => r.key === key);
      next[key] = configValueToString(row?.value);
    }
    setDraft(next);
  }, [rows]);

  useEffect(() => {
    const next: Record<string, MetricDraft> = {};
    for (const metric of metricCatalog.data ?? []) {
      next[metric.key] = {
        heLabel: metric.he_label,
        enLabel: metric.en_label,
        isCore: metric.is_core,
      };
    }
    setMetricDraft(next);
  }, [metricCatalog.data]);

  async function handleSave(key: ConfigKey) {
    const raw = draft[key] ?? "";
    if (!raw.trim()) {
      Alert.alert(t("common.error"), t("common.required"));
      return;
    }
    try {
      await setConfig.mutateAsync({
        key,
        value: parseConfigValue(key, raw.trim()),
      });
      Alert.alert(t("staff.configSaved"));
    } catch (err) {
      if (mfa.handleRpcError(err)) return;
      const msg = err instanceof Error ? err.message : t("common.tryAgain");
      Alert.alert(t("common.error"), msg);
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.rpc("export_system_data");
      if (error) throw error;
      const json = JSON.stringify(data ?? {}, null, 2);
      const filename = `toghther-export-${new Date().toISOString().slice(0, 10)}.json`;

      if (Platform.OS === "web" && typeof document !== "undefined") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
      } else {
        Alert.alert("ייצוא הושלם", `${filename} (${json.length} bytes)`);
      }
    } catch (err) {
      if (mfa.handleRpcError(err)) return;
      const msg = err instanceof Error ? err.message : t("common.tryAgain");
      Alert.alert(t("common.error"), msg);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleMetricSave(key: string) {
    const row = metricDraft[key];
    if (!row?.heLabel.trim() || !row.enLabel.trim()) {
      Alert.alert(t("common.error"), t("common.required"));
      return;
    }
    try {
      await updateMetric.mutateAsync({
        key,
        heLabel: row.heLabel,
        enLabel: row.enLabel,
        isCore: row.isCore,
      });
      Alert.alert(t("staff.metricSaved"));
    } catch (err) {
      if (mfa.handleRpcError(err)) return;
      const msg = err instanceof Error ? err.message : t("common.tryAgain");
      Alert.alert(t("common.error"), msg);
    }
  }

  if (!isReady || !isAdmin) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#534AB7" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        className="flex-1 px-6 py-6"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching || metricCatalog.isRefetching}
            onRefresh={() => {
              void refetch();
              void metricCatalog.refetch();
            }}
          />
        }
      >
        <Text className="text-2xl font-bold text-ink mb-2 font-rubik text-right">
          {t("staff.configTitle")}
        </Text>
        <Text className="text-sm text-ink-2 mb-6 text-right">
          {t("staff.configSubtitle")}
        </Text>

        <StaffQueryFeedback
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={() => void refetch()}
        />

        {!isLoading && !isError
          ? CONFIG_KEYS.map((key) => (
              <View
                key={key}
                className="bg-surface border border-border rounded-card p-4 mb-4"
              >
                <Text className="text-sm font-bold text-purple mb-1 font-rubik text-right">
                  {key}
                </Text>
                <Text className="text-xs text-ink-2 mb-3 text-right">
                  {t(`staff.configHint.${key}`)}
                </Text>
                <TextInput
                  value={draft[key] ?? ""}
                  onChangeText={(v) => setDraft((d) => ({ ...d, [key]: v }))}
                  placeholder={key}
                  placeholderTextColor="#918D84"
                  className="bg-bg border border-border rounded-card px-4 py-3 text-ink text-right mb-3"
                />
                <PrimaryButton
                  label={t("staff.configSave")}
                  onPress={() => handleSave(key)}
                  loading={setConfig.isPending}
                />
              </View>
            ))
          : null}
        <View className="h-8" />

        <View className="bg-purple-bg border border-purple rounded-card p-4 mb-6">
          <Text className="text-lg font-bold text-purple-ink mb-2 font-rubik text-right">
            ייצוא נתונים
          </Text>
          <Text className="text-sm text-ink-2 mb-4 text-right">
            הורד את כל נתוני המערכת (משתמשים, דיווחים, חיבורים) לקובץ JSON לשמירה וגיבוי מקומי. נדרשת הרשאת אדמין.
          </Text>
          <PrimaryButton
            label="הורד נתונים עכשיו"
            onPress={handleExport}
            loading={isExporting}
            variant="purple"
          />
        </View>

        <Text className="text-xl font-bold text-ink mb-2 font-rubik text-right">
          {t("staff.metricsTitle")}
        </Text>
        <Text className="text-sm text-ink-2 mb-4 text-right">
          {t("staff.metricsSubtitle")}
        </Text>

        <StaffQueryFeedback
          isLoading={metricCatalog.isLoading}
          isError={metricCatalog.isError}
          error={metricCatalog.error}
          isEmpty={(metricCatalog.data?.length ?? 0) === 0}
          emptyMessage={t("staff.metricsEmpty")}
          onRetry={() => void metricCatalog.refetch()}
        />

        {!metricCatalog.isLoading && !metricCatalog.isError
          ? (metricCatalog.data ?? []).map((metric) => {
              const row = metricDraft[metric.key] ?? {
                heLabel: metric.he_label,
                enLabel: metric.en_label,
                isCore: metric.is_core,
              };

              return (
                <View
                  key={metric.key}
                  className="bg-surface border border-border rounded-card p-4 mb-3"
                >
                  <View className="flex-row justify-between items-center mb-3">
                    <Pressable
                      onPress={() =>
                        setMetricDraft((d) => ({
                          ...d,
                          [metric.key]: {
                            ...row,
                            isCore: !row.isCore,
                          },
                        }))
                      }
                      className={`px-3 py-1 rounded-full border ${
                        row.isCore
                          ? "bg-teal border-teal"
                          : "bg-bg border-border"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          row.isCore ? "text-white" : "text-ink-2"
                        }`}
                      >
                        {t("staff.metricCore")}
                      </Text>
                    </Pressable>
                    <Text className="text-xs text-ink-2 font-rubik">
                      {metric.key}
                    </Text>
                  </View>
                  <TextInput
                    value={row.heLabel}
                    onChangeText={(v) =>
                      setMetricDraft((d) => ({
                        ...d,
                        [metric.key]: { ...row, heLabel: v },
                      }))
                    }
                    placeholder={t("staff.metricHeLabel")}
                    placeholderTextColor="#918D84"
                    className="bg-bg border border-border rounded-card px-4 py-3 text-ink text-right mb-2"
                  />
                  <TextInput
                    value={row.enLabel}
                    onChangeText={(v) =>
                      setMetricDraft((d) => ({
                        ...d,
                        [metric.key]: { ...row, enLabel: v },
                      }))
                    }
                    placeholder={t("staff.metricEnLabel")}
                    placeholderTextColor="#918D84"
                    className="bg-bg border border-border rounded-card px-4 py-3 text-ink text-right mb-3"
                  />
                  <PrimaryButton
                    label={t("staff.metricSave")}
                    onPress={() => handleMetricSave(metric.key)}
                    loading={updateMetric.isPending}
                  />
                </View>
              );
            })
          : null}
        <View className="h-8" />
      </ScrollView>

      <AdminMfaModal
        visible={mfa.showModal}
        onClose={() => mfa.setShowModal(false)}
        onVerified={mfa.onVerified}
      />
    </>
  );
}
