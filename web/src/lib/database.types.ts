// Database types for Supabase
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          phone: string | null;
          phone_verified: boolean;
          avatar_url: string | null;
          role: 'player' | 'commissioner' | 'admin';
          notification_email: boolean;
          notification_sms: boolean;
          notification_push: boolean;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name: string;
          phone?: string | null;
          phone_verified?: boolean;
          avatar_url?: string | null;
          role?: 'player' | 'commissioner' | 'admin';
          notification_email?: boolean;
          notification_sms?: boolean;
          notification_push?: boolean;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          phone?: string | null;
          phone_verified?: boolean;
          avatar_url?: string | null;
          role?: 'player' | 'commissioner' | 'admin';
          notification_email?: boolean;
          notification_sms?: boolean;
          notification_push?: boolean;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      seasons: {
        Row: {
          id: string;
          number: number;
          name: string;
          is_active: boolean;
          registration_opens_at: string;
          draft_order_deadline: string;
          registration_closes_at: string;
          premiere_at: string;
          draft_deadline: string;
          finale_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          number: number;
          name: string;
          is_active?: boolean;
          registration_opens_at: string;
          draft_order_deadline: string;
          registration_closes_at: string;
          premiere_at: string;
          draft_deadline: string;
          finale_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          number?: number;
          name?: string;
          is_active?: boolean;
          registration_opens_at?: string;
          draft_order_deadline?: string;
          registration_closes_at?: string;
          premiere_at?: string;
          draft_deadline?: string;
          finale_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      episodes: {
        Row: {
          id: string;
          season_id: string;
          number: number;
          title: string | null;
          air_date: string;
          picks_lock_at: string;
          results_posted_at: string | null;
          waiver_opens_at: string | null;
          waiver_closes_at: string | null;
          is_finale: boolean;
          is_scored: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          number: number;
          title?: string | null;
          air_date: string;
          picks_lock_at: string;
          results_posted_at?: string | null;
          waiver_opens_at?: string | null;
          waiver_closes_at?: string | null;
          is_finale?: boolean;
          is_scored?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string;
          number?: number;
          title?: string | null;
          air_date?: string;
          picks_lock_at?: string;
          results_posted_at?: string | null;
          waiver_opens_at?: string | null;
          waiver_closes_at?: string | null;
          is_finale?: boolean;
          is_scored?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'episodes_season_id_fkey';
            columns: ['season_id'];
            referencedRelation: 'seasons';
            referencedColumns: ['id'];
          },
        ];
      };
      castaways: {
        Row: {
          id: string;
          season_id: string;
          name: string;
          age: number | null;
          hometown: string | null;
          occupation: string | null;
          photo_url: string | null;
          tribe_original: string | null;
          status: 'active' | 'eliminated' | 'winner';
          eliminated_episode_id: string | null;
          placement: number | null;
          previous_seasons: string[] | null;
          best_placement: number | null;
          fun_fact: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          name: string;
          age?: number | null;
          hometown?: string | null;
          occupation?: string | null;
          photo_url?: string | null;
          tribe_original?: string | null;
          status?: 'active' | 'eliminated' | 'winner';
          eliminated_episode_id?: string | null;
          placement?: number | null;
          previous_seasons?: string[] | null;
          best_placement?: number | null;
          fun_fact?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string;
          name?: string;
          age?: number | null;
          hometown?: string | null;
          occupation?: string | null;
          photo_url?: string | null;
          tribe_original?: string | null;
          status?: 'active' | 'eliminated' | 'winner';
          eliminated_episode_id?: string | null;
          placement?: number | null;
          previous_seasons?: string[] | null;
          best_placement?: number | null;
          fun_fact?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'castaways_season_id_fkey';
            columns: ['season_id'];
            referencedRelation: 'seasons';
            referencedColumns: ['id'];
          },
        ];
      };
      scoring_rules: {
        Row: {
          id: string;
          season_id: string | null;
          code: string;
          name: string;
          description: string | null;
          points: number;
          category: string | null;
          is_negative: boolean;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id?: string | null;
          code: string;
          name: string;
          description?: string | null;
          points: number;
          category?: string | null;
          is_negative?: boolean;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string | null;
          code?: string;
          name?: string;
          description?: string | null;
          points?: number;
          category?: string | null;
          is_negative?: boolean;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      leagues: {
        Row: {
          id: string;
          season_id: string;
          name: string;
          code: string;
          password_hash: string | null;
          commissioner_id: string;
          max_players: number;
          is_global: boolean;
          is_public: boolean;
          require_donation: boolean;
          donation_amount: number | null;
          donation_notes: string | null;
          payout_method: string | null;
          status: 'forming' | 'drafting' | 'active' | 'completed';
          draft_status: 'pending' | 'in_progress' | 'completed';
          draft_order: Json | null;
          draft_started_at: string | null;
          draft_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          name: string;
          code?: string;
          password_hash?: string | null;
          commissioner_id: string;
          max_players?: number;
          is_global?: boolean;
          is_public?: boolean;
          require_donation?: boolean;
          donation_amount?: number | null;
          donation_notes?: string | null;
          payout_method?: string | null;
          status?: 'forming' | 'drafting' | 'active' | 'completed';
          draft_status?: 'pending' | 'in_progress' | 'completed';
          draft_order?: Json | null;
          draft_started_at?: string | null;
          draft_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string;
          name?: string;
          code?: string;
          password_hash?: string | null;
          commissioner_id?: string;
          max_players?: number;
          is_global?: boolean;
          is_public?: boolean;
          require_donation?: boolean;
          donation_amount?: number | null;
          donation_notes?: string | null;
          payout_method?: string | null;
          status?: 'forming' | 'drafting' | 'active' | 'completed';
          draft_status?: 'pending' | 'in_progress' | 'completed';
          draft_order?: Json | null;
          draft_started_at?: string | null;
          draft_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'leagues_season_id_fkey';
            columns: ['season_id'];
            referencedRelation: 'seasons';
            referencedColumns: ['id'];
          },
        ];
      };
      league_members: {
        Row: {
          id: string;
          league_id: string;
          user_id: string;
          draft_position: number | null;
          total_points: number;
          rank: number | null;
          previous_rank: number | null;
          joined_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          user_id: string;
          draft_position?: number | null;
          total_points?: number;
          rank?: number | null;
          previous_rank?: number | null;
          joined_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          user_id?: string;
          draft_position?: number | null;
          total_points?: number;
          rank?: number | null;
          previous_rank?: number | null;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'league_members_league_id_fkey';
            columns: ['league_id'];
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'league_members_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      rosters: {
        Row: {
          id: string;
          league_id: string;
          user_id: string;
          castaway_id: string;
          draft_round: number;
          draft_pick: number;
          acquired_via: string;
          acquired_at: string;
          dropped_at: string | null;
        };
        Insert: {
          id?: string;
          league_id: string;
          user_id: string;
          castaway_id: string;
          draft_round: number;
          draft_pick: number;
          acquired_via?: string;
          acquired_at?: string;
          dropped_at?: string | null;
        };
        Update: {
          id?: string;
          league_id?: string;
          user_id?: string;
          castaway_id?: string;
          draft_round?: number;
          draft_pick?: number;
          acquired_via?: string;
          acquired_at?: string;
          dropped_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'rosters_league_id_fkey';
            columns: ['league_id'];
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rosters_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rosters_castaway_id_fkey';
            columns: ['castaway_id'];
            referencedRelation: 'castaways';
            referencedColumns: ['id'];
          },
        ];
      };
      weekly_picks: {
        Row: {
          id: string;
          league_id: string;
          user_id: string;
          episode_id: string;
          castaway_id: string | null;
          status: 'pending' | 'locked' | 'auto_picked';
          points_earned: number;
          picked_at: string | null;
          locked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          user_id: string;
          episode_id: string;
          castaway_id?: string | null;
          status?: 'pending' | 'locked' | 'auto_picked';
          points_earned?: number;
          picked_at?: string | null;
          locked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          user_id?: string;
          episode_id?: string;
          castaway_id?: string | null;
          status?: 'pending' | 'locked' | 'auto_picked';
          points_earned?: number;
          picked_at?: string | null;
          locked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'weekly_picks_league_id_fkey';
            columns: ['league_id'];
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'weekly_picks_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'weekly_picks_episode_id_fkey';
            columns: ['episode_id'];
            referencedRelation: 'episodes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'weekly_picks_castaway_id_fkey';
            columns: ['castaway_id'];
            referencedRelation: 'castaways';
            referencedColumns: ['id'];
          },
        ];
      };
      episode_scores: {
        Row: {
          id: string;
          episode_id: string;
          castaway_id: string;
          scoring_rule_id: string;
          quantity: number;
          points: number;
          notes: string | null;
          entered_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          episode_id: string;
          castaway_id: string;
          scoring_rule_id: string;
          quantity?: number;
          points: number;
          notes?: string | null;
          entered_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          episode_id?: string;
          castaway_id?: string;
          scoring_rule_id?: string;
          quantity?: number;
          points?: number;
          notes?: string | null;
          entered_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'episode_scores_episode_id_fkey';
            columns: ['episode_id'];
            referencedRelation: 'episodes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'episode_scores_castaway_id_fkey';
            columns: ['castaway_id'];
            referencedRelation: 'castaways';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'episode_scores_scoring_rule_id_fkey';
            columns: ['scoring_rule_id'];
            referencedRelation: 'scoring_rules';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: 'player' | 'commissioner' | 'admin';
      league_status: 'forming' | 'drafting' | 'active' | 'completed';
      draft_status: 'pending' | 'in_progress' | 'completed';
      castaway_status: 'active' | 'eliminated' | 'winner';
      pick_status: 'pending' | 'locked' | 'auto_picked';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
