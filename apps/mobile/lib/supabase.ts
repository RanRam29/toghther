import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { Database } from "@toghther/shared";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes("your-project");

// Fall back to inert placeholders when env is missing so the app still renders
// (and can surface a config error) instead of crashing at module load — createClient
// throws synchronously on empty url/key, which otherwise blanks the whole app.
const resolvedUrl = supabaseUrl || "https://unconfigured.supabase.co";
const resolvedAnonKey = supabaseAnonKey || "unconfigured";

export const supabase = createClient<Database>(resolvedUrl, resolvedAnonKey, {
  auth: {
    storage: Platform.OS === "web" ? undefined : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
