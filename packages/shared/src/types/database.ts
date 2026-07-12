export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_notes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          note: string
          target_user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          note: string
          target_user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          note?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_match_reasons: {
        Row: {
          child_id: string
          created_at: string
          id: string
          professional_id: string
          reason_text: string
          updated_at: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          professional_id: string
          reason_text: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          professional_id?: string
          reason_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_match_reasons_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_match_reasons_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children_tier0"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_match_reasons_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          properties: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          properties?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          properties?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          resource: string
          resource_id: string | null
          tier: number | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource: string
          resource_id?: string | null
          tier?: number | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource?: string
          resource_id?: string | null
          tier?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          checkout_at: string | null
          checkout_location: unknown
          checkout_valid: boolean | null
          created_at: string
          id: string
          is_valid: boolean | null
          location: unknown
          match_id: string
        }
        Insert: {
          checkout_at?: string | null
          checkout_location?: unknown
          checkout_valid?: boolean | null
          created_at?: string
          id?: string
          is_valid?: boolean | null
          location: unknown
          match_id: string
        }
        Update: {
          checkout_at?: string | null
          checkout_location?: unknown
          checkout_valid?: boolean | null
          created_at?: string
          id?: string
          is_valid?: boolean | null
          location?: unknown
          match_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      child_details: {
        Row: {
          child_id: string
          created_at: string
          diagnosis_full: string | null
          full_name: string | null
          gender_preference: string | null
          id: string
          notes: string | null
          parent_contact: Json | null
          updated_at: string
          what_triggers: string | null
          what_works: string | null
          win_definition: string | null
        }
        Insert: {
          child_id: string
          created_at?: string
          diagnosis_full?: string | null
          full_name?: string | null
          gender_preference?: string | null
          id?: string
          notes?: string | null
          parent_contact?: Json | null
          updated_at?: string
          what_triggers?: string | null
          what_works?: string | null
          win_definition?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string
          diagnosis_full?: string | null
          full_name?: string | null
          gender_preference?: string | null
          id?: string
          notes?: string | null
          parent_contact?: Json | null
          updated_at?: string
          what_triggers?: string | null
          what_works?: string | null
          win_definition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_details_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_details_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "children_tier0"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          age: number
          category: Database["public"]["Enums"]["need_category"]
          communication_language: string | null
          communication_verbal: boolean
          created_at: string
          deleted_at: string | null
          first_name: string
          framework: Database["public"]["Enums"]["framework_type"]
          functioning_level: number
          hours_needed: Json | null
          id: string
          location: unknown
          needs: Json | null
          parent_id: string
          published: boolean
          secondary_category:
            | Database["public"]["Enums"]["need_category"]
            | null
          secondary_parent_id: string | null
          secondary_parent_permissions: Json | null
          updated_at: string
        }
        Insert: {
          age: number
          category: Database["public"]["Enums"]["need_category"]
          communication_language?: string | null
          communication_verbal?: boolean
          created_at?: string
          deleted_at?: string | null
          first_name: string
          framework: Database["public"]["Enums"]["framework_type"]
          functioning_level: number
          hours_needed?: Json | null
          id?: string
          location?: unknown
          needs?: Json | null
          parent_id: string
          published?: boolean
          secondary_category?:
            | Database["public"]["Enums"]["need_category"]
            | null
          secondary_parent_id?: string | null
          secondary_parent_permissions?: Json | null
          updated_at?: string
        }
        Update: {
          age?: number
          category?: Database["public"]["Enums"]["need_category"]
          communication_language?: string | null
          communication_verbal?: boolean
          created_at?: string
          deleted_at?: string | null
          first_name?: string
          framework?: Database["public"]["Enums"]["framework_type"]
          functioning_level?: number
          hours_needed?: Json | null
          id?: string
          location?: unknown
          needs?: Json | null
          parent_id?: string
          published?: boolean
          secondary_category?:
            | Database["public"]["Enums"]["need_category"]
            | null
          secondary_parent_id?: string | null
          secondary_parent_permissions?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_logs: {
        Row: {
          ai_strategy: string | null
          ai_summary: string | null
          created_at: string
          id: string
          log_date: string
          match_id: string
          metrics: Json | null
          mood: number | null
          notes: string | null
        }
        Insert: {
          ai_strategy?: string | null
          ai_summary?: string | null
          created_at?: string
          id?: string
          log_date: string
          match_id: string
          metrics?: Json | null
          mood?: number | null
          notes?: string | null
        }
        Update: {
          ai_strategy?: string | null
          ai_summary?: string | null
          created_at?: string
          id?: string
          log_date?: string
          match_id?: string
          metrics?: Json | null
          mood?: number | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      document_uploads: {
        Row: {
          created_at: string
          doc_type: Database["public"]["Enums"]["document_type"]
          file_name: string | null
          id: string
          owner_id: string
          rejection_note: string | null
          storage_path: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          doc_type: Database["public"]["Enums"]["document_type"]
          file_name?: string | null
          id?: string
          owner_id: string
          rejection_note?: string | null
          storage_path: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string | null
          id?: string
          owner_id?: string
          rejection_note?: string | null
          storage_path?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_uploads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_uploads_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_requests: {
        Row: {
          child_id: string
          cover_letter: string | null
          created_at: string
          decline_reason: string | null
          id: string
          initiated_by: string
          match_reason: string | null
          parent_message: string | null
          professional_id: string
          score: number | null
          status: Database["public"]["Enums"]["match_request_status"]
          tier_reached: number
          updated_at: string
        }
        Insert: {
          child_id: string
          cover_letter?: string | null
          created_at?: string
          decline_reason?: string | null
          id?: string
          initiated_by?: string
          match_reason?: string | null
          parent_message?: string | null
          professional_id: string
          score?: number | null
          status?: Database["public"]["Enums"]["match_request_status"]
          tier_reached?: number
          updated_at?: string
        }
        Update: {
          child_id?: string
          cover_letter?: string | null
          created_at?: string
          decline_reason?: string | null
          id?: string
          initiated_by?: string
          match_reason?: string | null
          parent_message?: string | null
          professional_id?: string
          score?: number | null
          status?: Database["public"]["Enums"]["match_request_status"]
          tier_reached?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_requests_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_requests_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children_tier0"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          child_id: string
          end_reason: string | null
          ended_at: string | null
          id: string
          match_reason: string | null
          metric_keys: string[] | null
          professional_id: string
          request_id: string | null
          score: number | null
          started_at: string
          status: Database["public"]["Enums"]["match_status"]
        }
        Insert: {
          child_id: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          match_reason?: string | null
          metric_keys?: string[] | null
          professional_id: string
          request_id?: string | null
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["match_status"]
        }
        Update: {
          child_id?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          match_reason?: string | null
          metric_keys?: string[] | null
          professional_id?: string
          request_id?: string | null
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["match_status"]
        }
        Relationships: [
          {
            foreignKeyName: "matches_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children_tier0"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "match_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_catalog: {
        Row: {
          categories: Database["public"]["Enums"]["need_category"][]
          en_label: string
          he_label: string
          is_core: boolean
          key: string
        }
        Insert: {
          categories?: Database["public"]["Enums"]["need_category"][]
          en_label: string
          he_label: string
          is_core?: boolean
          key: string
        }
        Update: {
          categories?: Database["public"]["Enums"]["need_category"][]
          en_label?: string
          he_label?: string
          is_core?: boolean
          key?: string
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          checkin: boolean
          daily_summary: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          checkin?: boolean
          daily_summary?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          checkin?: boolean
          daily_summary?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      parent_invitations: {
        Row: {
          child_id: string
          created_at: string
          id: string
          invited_phone: string
          inviter_id: string
          status: string
          updated_at: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          invited_phone: string
          inviter_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          invited_phone?: string
          inviter_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_invitations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_invitations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children_tier0"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          assigned_at: string | null
          assigned_supervisor_id: string | null
          availability: Json | null
          backup_available: boolean
          bio: string | null
          certifications: string[]
          created_at: string
          deleted_at: string | null
          display_name: string
          experience_years: number | null
          framework_types: Database["public"]["Enums"]["framework_type"][]
          id: string
          languages: string[]
          location: unknown
          max_radius_km: number | null
          rating_avg: number | null
          rating_count: number | null
          specialties: Database["public"]["Enums"]["need_category"][]
          type: string
          updated_at: string
          user_id: string
          verification_checklist: Json | null
          verified: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_supervisor_id?: string | null
          availability?: Json | null
          backup_available?: boolean
          bio?: string | null
          certifications?: string[]
          created_at?: string
          deleted_at?: string | null
          display_name: string
          experience_years?: number | null
          framework_types?: Database["public"]["Enums"]["framework_type"][]
          id?: string
          languages?: string[]
          location?: unknown
          max_radius_km?: number | null
          rating_avg?: number | null
          rating_count?: number | null
          specialties?: Database["public"]["Enums"]["need_category"][]
          type?: string
          updated_at?: string
          user_id: string
          verification_checklist?: Json | null
          verified?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_supervisor_id?: string | null
          availability?: Json | null
          backup_available?: boolean
          bio?: string | null
          certifications?: string[]
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          experience_years?: number | null
          framework_types?: Database["public"]["Enums"]["framework_type"][]
          id?: string
          languages?: string[]
          location?: unknown
          max_radius_km?: number | null
          rating_avg?: number | null
          rating_count?: number | null
          specialties?: Database["public"]["Enums"]["need_category"][]
          type?: string
          updated_at?: string
          user_id?: string
          verification_checklist?: Json | null
          verified?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_assigned_supervisor_id_fkey"
            columns: ["assigned_supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          area: string | null
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          preferred_language: string
          role: Database["public"]["Enums"]["user_role"]
          suspended_at: string | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          preferred_language?: string
          role: Database["public"]["Enums"]["user_role"]
          suspended_at?: string | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_language?: string
          role?: Database["public"]["Enums"]["user_role"]
          suspended_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          child_fit: number
          created_at: string
          id: string
          match_id: string
          professionalism: number
          reliability: number
          reviewer_id: string
          reviewer_role: Database["public"]["Enums"]["reviewer_role"]
          text: string | null
        }
        Insert: {
          child_fit: number
          created_at?: string
          id?: string
          match_id: string
          professionalism: number
          reliability: number
          reviewer_id: string
          reviewer_role: Database["public"]["Enums"]["reviewer_role"]
          text?: string | null
        }
        Update: {
          child_fit?: number
          created_at?: string
          id?: string
          match_id?: string
          professionalism?: number
          reliability?: number
          reviewer_id?: string
          reviewer_role?: Database["public"]["Enums"]["reviewer_role"]
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      supervisor_document_views: {
        Row: {
          document_id: string
          supervisor_id: string
          viewed_at: string
        }
        Insert: {
          document_id: string
          supervisor_id: string
          viewed_at?: string
        }
        Update: {
          document_id?: string
          supervisor_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_document_views_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_document_views_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      children_tier0: {
        Row: {
          age: number | null
          area_general: string | null
          category: Database["public"]["Enums"]["need_category"] | null
          created_at: string | null
          first_name: string | null
          framework: Database["public"]["Enums"]["framework_type"] | null
          hours_needed: Json | null
          id: string | null
          secondary_category:
            | Database["public"]["Enums"]["need_category"]
            | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      view_parent_funnel: {
        Row: {
          conversion_to_match_pct: number | null
          conversion_to_request_pct: number | null
          parents_activated: number | null
          parents_sent_request: number | null
          parents_viewed_matches: number | null
          parents_with_match: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      accept_parent_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      admin_log_reasoned_view: {
        Args: { p_reason: string; p_resource: string; p_resource_id: string }
        Returns: undefined
      }
      admin_reject_document: {
        Args: { p_doc_id: string; p_reason: string }
        Returns: undefined
      }
      admin_release_supervisor_assignment: {
        Args: { p_pro_id: string }
        Returns: undefined
      }
      admin_restore_user: { Args: { p_user_id: string }; Returns: undefined }
      admin_set_config: {
        Args: { p_key: string; p_value: Json }
        Returns: undefined
      }
      admin_suspend_user: {
        Args: { p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_unpublish_child: {
        Args: { p_child_id: string; p_reason: string }
        Returns: undefined
      }
      admin_update_metric_catalog: {
        Args: {
          p_en_label: string
          p_he_label: string
          p_is_core: boolean
          p_key: string
        }
        Returns: undefined
      }
      admin_verify_professional: {
        Args: { p_checklist: Json; p_pro_id: string }
        Returns: undefined
      }
      anonymize_user: { Args: { p_user_id: string }; Returns: undefined }
      approve_request: { Args: { p_request_id: string }; Returns: undefined }
      availability_overlaps: {
        Args: { avail: Json; needed: Json }
        Returns: boolean
      }
      calculate_match_score: {
        Args: { p_child_id: string; p_professional_id: string }
        Returns: {
          match_reason: string
          score: number
        }[]
      }
      check_admin_mfa: { Args: never; Returns: undefined }
      create_match_from_request: {
        Args: { p_request_id: string }
        Returns: string
      }
      decline_after_intro: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: undefined
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      end_match: {
        Args: { p_match_id: string; p_reason?: string }
        Returns: undefined
      }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      export_system_data: { Args: never; Returns: Json }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_child_details: {
        Args: { p_child_id: string }
        Returns: {
          child_id: string
          created_at: string
          diagnosis_full: string
          full_name: string
          gender_preference: string
          id: string
          notes: string
          parent_contact: Json
          updated_at: string
          what_triggers: string
          what_works: string
          win_definition: string
        }[]
      }
      get_intro_contact: {
        Args: { p_request_id: string }
        Returns: {
          display_name: string
          phone: string
          professional_id: string
        }[]
      }
      get_live_ops_alerts: {
        Args: never
        Returns: {
          alert_id: string
          alert_type: string
          created_at: string
          details: Json
          resource_id: string
          severity: string
        }[]
      }
      get_matches_for_child: {
        Args: { p_child_id: string; p_limit?: number }
        Returns: {
          bio: string
          display_name: string
          distance_km: number
          experience_years: number
          match_reason: string
          professional_id: string
          rating_avg: number
          rating_count: number
          score: number
          specialties: Database["public"]["Enums"]["need_category"][]
        }[]
      }
      get_metrics_for_child: {
        Args: { p_child_id: string }
        Returns: {
          categories: Database["public"]["Enums"]["need_category"][]
          en_label: string
          he_label: string
          is_core: boolean
          key: string
        }[]
        SetofOptions: {
          from: "*"
          to: "metric_catalog"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_professional_id: { Args: never; Returns: string }
      get_tier_for_child: { Args: { p_child_id: string }; Returns: number }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      gettransactionid: { Args: never; Returns: unknown }
      has_active_match: { Args: { p_child_id: string }; Returns: boolean }
      invite_secondary_parent: {
        Args: { p_child_id: string; p_phone: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff_verifier: { Args: never; Returns: boolean }
      is_supervisor: { Args: never; Returns: boolean }
      is_verified_professional: { Args: never; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      notify_push: {
        Args: {
          p_body: string
          p_category?: string
          p_data?: Json
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      pause_match: { Args: { p_match_id: string }; Returns: undefined }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      reject_request: { Args: { p_request_id: string }; Returns: undefined }
      remove_secondary_parent: {
        Args: { p_child_id: string }
        Returns: undefined
      }
      respond_to_request: {
        Args: { p_request_id: string; p_status: string }
        Returns: undefined
      }
      resume_match: { Args: { p_match_id: string }; Returns: undefined }
      seed_test_data: { Args: never; Returns: string }
      set_match_metrics: {
        Args: { p_keys: string[]; p_match_id: string }
        Returns: undefined
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      submit_review: {
        Args: { p_criteria: Json; p_match_id: string; p_text: string }
        Returns: undefined
      }
      supervisor_claim_professional: {
        Args: { p_pro_id: string }
        Returns: undefined
      }
      supervisor_log_document_view: {
        Args: { p_doc_id: string }
        Returns: undefined
      }
      supervisor_reject_document: {
        Args: { p_doc_id: string; p_reason: string }
        Returns: Json
      }
      supervisor_verify_professional: {
        Args: { p_checklist: Json; p_pro_id: string }
        Returns: undefined
      }
      track_event: {
        Args: { p_event_name: string; p_properties?: Json }
        Returns: undefined
      }
      transfer_primary_parent: {
        Args: { p_child_id: string }
        Returns: undefined
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_secondary_permissions: {
        Args: { p_child_id: string; p_permissions: Json }
        Returns: undefined
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      verify_checkin: {
        Args: {
          p_geofence_radius_m?: number
          p_latitude: number
          p_longitude: number
          p_match_id: string
        }
        Returns: {
          checkin_id: string
          distance_m: number
          is_valid: boolean
        }[]
      }
      verify_checkout: {
        Args: {
          p_checkin_id: string
          p_geofence_radius_m?: number
          p_latitude: number
          p_longitude: number
        }
        Returns: {
          distance_m: number
          is_valid: boolean
        }[]
      }
      withdraw_request: { Args: { p_request_id: string }; Returns: undefined }
    }
    Enums: {
      document_type:
        | "certificate"
        | "criminal_record"
        | "id_card"
        | "degree"
        | "other"
      framework_type:
        | "regular_school"
        | "special_ed"
        | "kindergarten"
        | "special_kindergarten"
        | "daycare"
        | "home"
        | "other"
      match_request_status:
        | "pending"
        | "interested"
        | "approved"
        | "rejected"
        | "expired"
        | "withdrawn"
      match_status: "active" | "paused" | "ended" | "cancelled"
      need_category:
        | "autism"
        | "adhd"
        | "learning_disability"
        | "physical"
        | "hearing"
        | "vision"
        | "intellectual"
        | "emotional"
        | "speech"
        | "other"
      reviewer_role: "parent" | "professional"
      user_role: "parent" | "professional" | "admin" | "supervisor"
      verification_status: "pending" | "submitted" | "verified" | "rejected"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      document_type: [
        "certificate",
        "criminal_record",
        "id_card",
        "degree",
        "other",
      ],
      framework_type: [
        "regular_school",
        "special_ed",
        "kindergarten",
        "special_kindergarten",
        "daycare",
        "home",
        "other",
      ],
      match_request_status: [
        "pending",
        "interested",
        "approved",
        "rejected",
        "expired",
        "withdrawn",
      ],
      match_status: ["active", "paused", "ended", "cancelled"],
      need_category: [
        "autism",
        "adhd",
        "learning_disability",
        "physical",
        "hearing",
        "vision",
        "intellectual",
        "emotional",
        "speech",
        "other",
      ],
      reviewer_role: ["parent", "professional"],
      user_role: ["parent", "professional", "admin", "supervisor"],
      verification_status: ["pending", "submitted", "verified", "rejected"],
    },
  },
} as const
