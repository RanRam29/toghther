export type { Database, Json } from "./types/database";

import type { Database } from "./types/database";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

export type Profile = Tables<"profiles">;
export type Child = Tables<"children">;
export type ChildDetails = Tables<"child_details">;
export type Professional = Tables<"professionals">;
export type MatchRequest = Tables<"match_requests">;
export type Match = Tables<"matches">;
export type Checkin = Tables<"checkins">;
export type DailyLog = Tables<"daily_logs">;
export type Review = Tables<"reviews">;

export type UserRole = "parent" | "professional" | "admin" | "supervisor";
export type AppLanguage = "he" | "en";
