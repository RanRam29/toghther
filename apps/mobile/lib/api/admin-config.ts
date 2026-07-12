import type { Json } from "@toghther/shared";

import { supabase } from "@/lib/supabase";

export interface SystemConfigRow {
  key: string;
  value: unknown;
  updated_at: string;
}

export const CONFIG_KEYS = [
  "geofence_radius_m",
  "request_expiration_days",
  "monthly_request_quota",
  "launch_city",
] as const;

export type ConfigKey = (typeof CONFIG_KEYS)[number];

export async function fetchSystemConfig(): Promise<SystemConfigRow[]> {
  const { data, error } = await supabase
    .from("system_config" as "profiles")
    .select("key, value, updated_at")
    .in("key" as "id", [...CONFIG_KEYS]);

  if (error) throw error;
  return (data ?? []) as unknown as SystemConfigRow[];
}

export async function adminSetConfig(
  key: string,
  value: unknown,
): Promise<void> {
  const { error } = await supabase.rpc("admin_set_config", {
    p_key: key,
    p_value: value as Json,
  });
  if (error) throw error;
}

export interface MetricCatalogRow {
  key: string;
  he_label: string;
  en_label: string;
  is_core: boolean;
  categories: string[];
}

export async function fetchMetricCatalog(): Promise<MetricCatalogRow[]> {
  const { data, error } = await supabase
    .from("metric_catalog" as "profiles")
    .select("key, he_label, en_label, is_core, categories")
    .order("key" as "id");

  if (error) throw error;
  return (data ?? []) as unknown as MetricCatalogRow[];
}

export async function adminUpdateMetricCatalog(input: {
  key: string;
  heLabel: string;
  enLabel: string;
  isCore: boolean;
}): Promise<void> {
  const { error } = await supabase.rpc("admin_update_metric_catalog", {
    p_key: input.key,
    p_he_label: input.heLabel.trim(),
    p_en_label: input.enLabel.trim(),
    p_is_core: input.isCore,
  });
  if (error) throw error;
}
