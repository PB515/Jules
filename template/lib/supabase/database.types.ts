// database.types.ts — HAND-WRITTEN PLACEHOLDER.
// Normally generated via `npm run db:types` (supabase gen types), never
// hand-written (see db/migrations/README.md). This build has no Docker/local
// Supabase available to run against, so these types were written by hand from
// db/migrations/0003-0014 to keep the app compiling. Regenerate for real once
// `supabase start` (or a hosted project) is reachable — treat this file as
// unverified against a live schema until then.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type StudentStatus = 'active' | 'locked';
export type AdminRole = 'professor' | 'committee_member';
export type EventType = 'standard_meeting' | 'expert_session' | 'volunteer_task' | 'surge';
export type SurgeStatus = 'draft' | 'live' | 'complete';
export type SeasonCadence = 'semester' | 'trimester' | 'annual' | 'custom';
export type TransactionType = 'event_scan' | 'surge_correct_answer' | 'admin_manual_adjustment';
export type AuditAction = 'force_reset' | 'manual_joule_adjustment' | 'csv_import' | 'role_change';
export type Tier = 'ember' | 'volt' | 'current' | 'plasma';
export type SurgeOption = 'A' | 'B' | 'C' | 'D';
export type LivePhase = 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'complete';

export interface Database {
  public: {
    Tables: {
      db_meta: {
        Row: { applied_at: string; checksum: string; filename: string; name: string; version: string };
        Insert: { applied_at?: string; checksum: string; filename: string; name: string; version: string };
        Update: Partial<Database['public']['Tables']['db_meta']['Insert']>;
        Relationships: [];
      };
      institution_settings: {
        Row: { id: boolean; allowed_domains: string[]; updated_at: string };
        Insert: { id?: boolean; allowed_domains?: string[]; updated_at?: string };
        Update: Partial<Database['public']['Tables']['institution_settings']['Insert']>;
        Relationships: [];
      };
      students: {
        Row: {
          id: string; name: string; college_email: string; phone: string | null;
          status: StudentStatus; streak_days: number; last_active_date: string | null;
          created_at: string;
        };
        Insert: {
          id: string; name: string; college_email: string; phone?: string | null;
          status?: StudentStatus; streak_days?: number; last_active_date?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['students']['Insert']>;
        Relationships: [];
      };
      admins: {
        Row: {
          id: string; name: string; email: string; role: AdminRole;
          club_id: string | null; created_at: string;
        };
        Insert: {
          id: string; name: string; email: string; role: AdminRole;
          club_id?: string | null; created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['admins']['Insert']>;
        Relationships: [];
      };
      clubs: {
        Row: { id: string; name: string; slug: string; description: string | null; created_at: string };
        Insert: { id?: string; name: string; slug: string; description?: string | null; created_at?: string };
        Update: Partial<Database['public']['Tables']['clubs']['Insert']>;
        Relationships: [];
      };
      seasons: {
        Row: {
          id: string; label: string; start_date: string; end_date: string;
          cadence: SeasonCadence; created_at: string;
        };
        Insert: {
          id?: string; label: string; start_date: string; end_date: string;
          cadence: SeasonCadence; created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['seasons']['Insert']>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string; name: string; type: EventType; event_date: string; end_date: string | null;
          location: string | null; joule_value: number | null; club_id: string;
          geofence_lat: number | null; geofence_lng: number | null; geofence_radius_m: number;
          created_by: string | null; created_at: string;
        };
        Insert: {
          id?: string; name: string; type: EventType; event_date: string; end_date?: string | null;
          location?: string | null; joule_value?: number | null; club_id: string;
          geofence_lat?: number | null; geofence_lng?: number | null; geofence_radius_m?: number;
          created_by?: string | null; created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
        Relationships: [];
      };
      surges: {
        Row: {
          id: string; event_id: string | null; name: string; season_id: string | null; club_id: string;
          status: SurgeStatus; points_per_question: number;
          starts_at: string | null; ends_at: string | null;
          created_by: string | null; created_at: string;
        };
        Insert: {
          id?: string; event_id?: string | null; name: string; season_id?: string | null; club_id: string;
          status?: SurgeStatus; points_per_question?: number;
          starts_at?: string | null; ends_at?: string | null;
          created_by?: string | null; created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['surges']['Insert']>;
        Relationships: [];
      };
      questions: {
        Row: {
          id: string; surge_id: string; text: string;
          option_a: string; option_b: string; option_c: string; option_d: string;
          correct_option: SurgeOption; time_limit_seconds: number; time_limit_flagged: boolean;
          tag: string | null; order_index: number; created_at: string;
        };
        Insert: {
          id?: string; surge_id: string; text: string;
          option_a: string; option_b: string; option_c: string; option_d: string;
          correct_option: SurgeOption; time_limit_seconds?: number; time_limit_flagged?: boolean;
          tag?: string | null; order_index?: number; created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['questions']['Insert']>;
        Relationships: [];
      };
      joule_transactions: {
        Row: {
          id: string; student_id: string; event_id: string | null; surge_id: string | null;
          question_id: string | null; amount: number; type: TransactionType;
          response_time_ms: number | null; flagged_geofence: boolean;
          created_by_admin: string | null; created_at: string;
        };
        Insert: never; // insert-only via RPCs — never a direct client insert
        Update: never;
        Relationships: [];
      };
      surge_answers: {
        Row: {
          id: string; student_id: string; question_id: string; selected_option: SurgeOption;
          correct: boolean; response_time_ms: number | null; created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      audit_log_entries: {
        Row: {
          id: string; admin_id: string | null; action: AuditAction;
          target_student_id: string | null; details: Json; created_at: string;
        };
        // No RLS policy grants a direct client insert (0005) — the only real
        // caller is the Force Reset server action, using the service-role
        // client (bypasses RLS by design). Kept as a real shape, not `never`,
        // so that one legitimate path still type-checks.
        Insert: {
          id?: string; admin_id?: string | null; action: AuditAction;
          target_student_id?: string | null; details?: Json; created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      live_rounds: {
        Row: {
          id: string; surge_id: string; room_code: string; phase: LivePhase;
          question_index: number; question_started_at: string | null;
          created_by: string; created_at: string;
        };
        Insert: never; // only via host_create_round()
        Update: never; // only via host_advance_round()
        Relationships: [];
      };
      live_round_teams: {
        Row: { id: string; round_id: string; student_id: string; team_name: string; joined_at: string };
        Insert: never; // only via join_live_round()
        Update: never;
        Relationships: [];
      };
      live_round_answers: {
        Row: {
          id: string; round_id: string; team_id: string; question_id: string;
          selected_option: SurgeOption; correct: boolean; response_time_ms: number | null; created_at: string;
        };
        Insert: never; // only via submit_live_answer()
        Update: never;
        Relationships: [];
      };
      event_reports: {
        Row: {
          id: string; title: string; summary: string; highlights: string[]; event_id: string;
          uploaded_by: string | null; created_at: string;
        };
        Insert: {
          id?: string; title: string; summary: string; highlights?: string[]; event_id: string;
          uploaded_by?: string | null; created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['event_reports']['Insert']>;
        Relationships: [];
      };
      gallery_images: {
        Row: { id: string; caption: string | null; file_path: string; uploaded_by: string | null; created_at: string };
        Insert: {
          id?: string; caption?: string | null; file_path: string;
          uploaded_by?: string | null; created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['gallery_images']['Insert']>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      keepalive: { Args: Record<string, never>; Returns: string };
      my_totals: {
        Args: Record<string, never>;
        Returns: { season_joules: number; lifetime_joules: number; tier: Tier; streak_days: number; status: StudentStatus }[];
      };
      is_email_domain_allowed: { Args: { p_email: string }; Returns: boolean };
      complete_onboarding: { Args: { p_name: string; p_phone: string }; Returns: Database['public']['Tables']['students']['Row'] };
      current_qr_token: { Args: { p_event_id: string }; Returns: { token: string; expires_at: string }[] };
      event_scan_metrics: { Args: { p_event_id: string }; Returns: { students_scanned: number; joules_distributed: number }[] };
      event_recent_scans: {
        Args: { p_event_id: string; p_limit?: number };
        Returns: { student_name: string; amount: number; flagged_geofence: boolean; created_at: string }[];
      };
      redeem_event_scan: {
        Args: { p_event_id: string; p_token: string; p_lat?: number | null; p_lng?: number | null };
        Returns: { amount: number; season_joules: number; tier: Tier; flagged_geofence: boolean }[];
      };
      start_surge: {
        Args: { p_surge_id: string };
        Returns: {
          id: string; text: string; option_a: string; option_b: string; option_c: string; option_d: string;
          time_limit_seconds: number; order_index: number; already_answered: boolean;
        }[];
      };
      submit_surge_answer: {
        Args: { p_question_id: string; p_selected_option: string; p_response_time_ms?: number | null };
        Returns: { correct: boolean; correct_option: SurgeOption; awarded: number }[];
      };
      surge_leaderboard: {
        Args: { p_surge_id: string };
        Returns: {
          student_id: string; name: string; total_amount: number;
          avg_response_time_ms: number | null; earliest_completed_at: string | null; rank: number;
        }[];
      };
      season_leaderboard: {
        Args: { p_season_id: string };
        Returns: { student_id: string; name: string; total_amount: number; rank: number }[];
      };
      monthly_engagement: {
        Args: Record<string, never>;
        Returns: { month: string; event_type: EventType; total_joules: number; scan_count: number }[];
      };
      event_engagement_totals: {
        Args: Record<string, never>;
        Returns: { event_id: string; total_attendees: number; total_joules: number }[];
      };
      admin_student_totals: {
        Args: Record<string, never>;
        Returns: {
          id: string; name: string; college_email: string; phone: string | null; status: StudentStatus;
          streak_days: number; season_joules: number; lifetime_joules: number; tier: Tier;
        }[];
      };
      admin_adjust_joules: { Args: { p_student_id: string; p_amount: number; p_reason: string }; Returns: undefined };
      admin_set_student_status: { Args: { p_student_id: string; p_status: StudentStatus }; Returns: undefined };
      admin_create_admin: {
        Args: { p_user_id: string; p_name: string; p_email: string; p_role: AdminRole; p_club_id?: string | null };
        Returns: Database['public']['Tables']['admins']['Row'];
      };
      admin_set_role: { Args: { p_admin_id: string; p_role: AdminRole; p_club_id?: string | null }; Returns: undefined };
      log_csv_import: { Args: { p_surge_id: string; p_details: Json }; Returns: undefined };
      host_create_round: { Args: { p_surge_id: string }; Returns: Database['public']['Tables']['live_rounds']['Row'] };
      join_live_round: {
        Args: { p_room_code: string; p_team_name: string };
        Returns: Database['public']['Tables']['live_round_teams']['Row'];
      };
      host_advance_round: { Args: { p_round_id: string }; Returns: Database['public']['Tables']['live_rounds']['Row'] };
      submit_live_answer: {
        Args: { p_round_id: string; p_question_id: string; p_selected_option: string; p_response_time_ms?: number | null };
        Returns: { correct: boolean; correct_option: SurgeOption; awarded: number }[];
      };
      live_round_scoreboard: {
        Args: { p_round_id: string };
        Returns: { team_id: string; team_name: string; total_amount: number; rank: number }[];
      };
      live_round_question: {
        Args: { p_round_id: string };
        Returns: {
          id: string; text: string; option_a: string; option_b: string; option_c: string; option_d: string;
          time_limit_seconds: number; correct_option: SurgeOption | null; phase: LivePhase; question_index: number;
        }[];
      };
      public_events: {
        Args: Record<string, never>;
        Returns: { id: string; name: string; type: EventType; event_date: string; location: string | null }[];
      };
      public_event_stats: {
        Args: { p_event_id: string };
        Returns: { total_attendees: number; total_joules: number }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
