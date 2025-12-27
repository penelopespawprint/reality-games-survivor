export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  public: {
    Tables: {
      castaways: {
        Row: {
          age: number | null;
          created_at: string | null;
          eliminated_episode_id: string | null;
          hometown: string | null;
          id: string;
          name: string;
          occupation: string | null;
          photo_url: string | null;
          placement: number | null;
          season_id: string;
          status: Database['public']['Enums']['castaway_status'] | null;
          tribe_original: string | null;
          updated_at: string | null;
        };
        Insert: {
          age?: number | null;
          created_at?: string | null;
          eliminated_episode_id?: string | null;
          hometown?: string | null;
          id?: string;
          name: string;
          occupation?: string | null;
          photo_url?: string | null;
          placement?: number | null;
          season_id: string;
          status?: Database['public']['Enums']['castaway_status'] | null;
          tribe_original?: string | null;
          updated_at?: string | null;
        };
        Update: {
          age?: number | null;
          created_at?: string | null;
          eliminated_episode_id?: string | null;
          hometown?: string | null;
          id?: string;
          name?: string;
          occupation?: string | null;
          photo_url?: string | null;
          placement?: number | null;
          season_id?: string;
          status?: Database['public']['Enums']['castaway_status'] | null;
          tribe_original?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'castaways_eliminated_episode_id_fkey';
            columns: ['eliminated_episode_id'];
            isOneToOne: false;
            referencedRelation: 'episodes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'castaways_season_id_fkey';
            columns: ['season_id'];
            isOneToOne: false;
            referencedRelation: 'seasons';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_messages: {
        Row: {
          content: string;
          created_at: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          gif_url: string | null;
          id: string;
          is_anonymous: boolean | null;
          is_deleted: boolean | null;
          is_pinned: boolean | null;
          league_id: string | null;
          mentions: string[] | null;
          pinned_at: string | null;
          pinned_by: string | null;
          reactions: Json | null;
          reply_to_id: string | null;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          gif_url?: string | null;
          id?: string;
          is_anonymous?: boolean | null;
          is_deleted?: boolean | null;
          is_pinned?: boolean | null;
          league_id?: string | null;
          mentions?: string[] | null;
          pinned_at?: string | null;
          pinned_by?: string | null;
          reactions?: Json | null;
          reply_to_id?: string | null;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          gif_url?: string | null;
          id?: string;
          is_anonymous?: boolean | null;
          is_deleted?: boolean | null;
          is_pinned?: boolean | null;
          league_id?: string | null;
          mentions?: string[] | null;
          pinned_at?: string | null;
          pinned_by?: string | null;
          reactions?: Json | null;
          reply_to_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_messages_deleted_by_fkey';
            columns: ['deleted_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_messages_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_messages_pinned_by_fkey';
            columns: ['pinned_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_messages_reply_to_id_fkey';
            columns: ['reply_to_id'];
            isOneToOne: false;
            referencedRelation: 'chat_messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_messages_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_presence: {
        Row: {
          id: string;
          is_typing: boolean | null;
          last_seen_at: string | null;
          league_id: string | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          is_typing?: boolean | null;
          last_seen_at?: string | null;
          league_id?: string | null;
          user_id: string;
        };
        Update: {
          id?: string;
          is_typing?: boolean | null;
          last_seen_at?: string | null;
          league_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_presence_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_presence_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      draft_rankings: {
        Row: {
          created_at: string | null;
          id: string;
          rankings: Json;
          season_id: string;
          submitted_at: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          rankings?: Json;
          season_id: string;
          submitted_at?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          rankings?: Json;
          season_id?: string;
          submitted_at?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'draft_rankings_season_id_fkey';
            columns: ['season_id'];
            isOneToOne: false;
            referencedRelation: 'seasons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'draft_rankings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      email_queue: {
        Row: {
          attempts: number | null;
          created_at: string | null;
          failed_at: string | null;
          html: string;
          id: string;
          last_error: string | null;
          max_attempts: number | null;
          next_retry_at: string | null;
          sent_at: string | null;
          subject: string;
          text: string | null;
          to_email: string;
          type: string;
        };
        Insert: {
          attempts?: number | null;
          created_at?: string | null;
          failed_at?: string | null;
          html: string;
          id?: string;
          last_error?: string | null;
          max_attempts?: number | null;
          next_retry_at?: string | null;
          sent_at?: string | null;
          subject: string;
          text?: string | null;
          to_email: string;
          type: string;
        };
        Update: {
          attempts?: number | null;
          created_at?: string | null;
          failed_at?: string | null;
          html?: string;
          id?: string;
          last_error?: string | null;
          max_attempts?: number | null;
          next_retry_at?: string | null;
          sent_at?: string | null;
          subject?: string;
          text?: string | null;
          to_email?: string;
          type?: string;
        };
        Relationships: [];
      };
      episode_scores: {
        Row: {
          castaway_id: string;
          created_at: string | null;
          entered_by: string | null;
          episode_id: string;
          id: string;
          notes: string | null;
          points: number;
          quantity: number | null;
          scoring_rule_id: string;
        };
        Insert: {
          castaway_id: string;
          created_at?: string | null;
          entered_by?: string | null;
          episode_id: string;
          id?: string;
          notes?: string | null;
          points: number;
          quantity?: number | null;
          scoring_rule_id: string;
        };
        Update: {
          castaway_id?: string;
          created_at?: string | null;
          entered_by?: string | null;
          episode_id?: string;
          id?: string;
          notes?: string | null;
          points?: number;
          quantity?: number | null;
          scoring_rule_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'episode_scores_castaway_id_fkey';
            columns: ['castaway_id'];
            isOneToOne: false;
            referencedRelation: 'castaways';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'episode_scores_entered_by_fkey';
            columns: ['entered_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'episode_scores_episode_id_fkey';
            columns: ['episode_id'];
            isOneToOne: false;
            referencedRelation: 'episodes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'episode_scores_scoring_rule_id_fkey';
            columns: ['scoring_rule_id'];
            isOneToOne: false;
            referencedRelation: 'scoring_rules';
            referencedColumns: ['id'];
          },
        ];
      };
      episodes: {
        Row: {
          air_date: string;
          created_at: string | null;
          id: string;
          is_finale: boolean | null;
          is_scored: boolean | null;
          number: number;
          picks_lock_at: string;
          results_posted_at: string | null;
          results_released_at: string | null;
          results_released_by: string | null;
          scoring_finalized_at: string | null;
          scoring_finalized_by: string | null;
          season_id: string;
          title: string | null;
          updated_at: string | null;
          waiver_closes_at: string | null;
          waiver_opens_at: string | null;
          week_number: number;
        };
        Insert: {
          air_date: string;
          created_at?: string | null;
          id?: string;
          is_finale?: boolean | null;
          is_scored?: boolean | null;
          number: number;
          picks_lock_at: string;
          results_posted_at?: string | null;
          results_released_at?: string | null;
          results_released_by?: string | null;
          scoring_finalized_at?: string | null;
          scoring_finalized_by?: string | null;
          season_id: string;
          title?: string | null;
          updated_at?: string | null;
          waiver_closes_at?: string | null;
          waiver_opens_at?: string | null;
          week_number: number;
        };
        Update: {
          air_date?: string;
          created_at?: string | null;
          id?: string;
          is_finale?: boolean | null;
          is_scored?: boolean | null;
          number?: number;
          picks_lock_at?: string;
          results_posted_at?: string | null;
          results_released_at?: string | null;
          results_released_by?: string | null;
          scoring_finalized_at?: string | null;
          scoring_finalized_by?: string | null;
          season_id?: string;
          title?: string | null;
          updated_at?: string | null;
          waiver_closes_at?: string | null;
          waiver_opens_at?: string | null;
          week_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'episodes_results_released_by_fkey';
            columns: ['results_released_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'episodes_scoring_finalized_by_fkey';
            columns: ['scoring_finalized_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'episodes_season_id_fkey';
            columns: ['season_id'];
            isOneToOne: false;
            referencedRelation: 'seasons';
            referencedColumns: ['id'];
          },
        ];
      };
      failed_emails: {
        Row: {
          email_job: Json;
          failed_at: string | null;
          id: string;
          notes: string | null;
          retry_at: string | null;
          retry_attempted: boolean | null;
          retry_succeeded: boolean | null;
        };
        Insert: {
          email_job: Json;
          failed_at?: string | null;
          id?: string;
          notes?: string | null;
          retry_at?: string | null;
          retry_attempted?: boolean | null;
          retry_succeeded?: boolean | null;
        };
        Update: {
          email_job?: Json;
          failed_at?: string | null;
          id?: string;
          notes?: string | null;
          retry_at?: string | null;
          retry_attempted?: boolean | null;
          retry_succeeded?: boolean | null;
        };
        Relationships: [];
      };
      league_members: {
        Row: {
          draft_position: number | null;
          id: string;
          is_eliminated: boolean | null;
          joined_at: string | null;
          league_id: string;
          rank: number | null;
          total_points: number | null;
          user_id: string;
        };
        Insert: {
          draft_position?: number | null;
          id?: string;
          is_eliminated?: boolean | null;
          joined_at?: string | null;
          league_id: string;
          rank?: number | null;
          total_points?: number | null;
          user_id: string;
        };
        Update: {
          draft_position?: number | null;
          id?: string;
          is_eliminated?: boolean | null;
          joined_at?: string | null;
          league_id?: string;
          rank?: number | null;
          total_points?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'league_members_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'league_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      league_messages: {
        Row: {
          content: string;
          created_at: string | null;
          id: string;
          league_id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          id?: string;
          league_id: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          id?: string;
          league_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'league_messages_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'league_messages_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      leagues: {
        Row: {
          code: string;
          commissioner_id: string;
          created_at: string | null;
          donation_amount: number | null;
          donation_notes: string | null;
          draft_completed_at: string | null;
          draft_order: Json | null;
          draft_started_at: string | null;
          draft_status: Database['public']['Enums']['draft_status'] | null;
          id: string;
          is_global: boolean | null;
          is_public: boolean | null;
          max_players: number | null;
          name: string;
          password_hash: string | null;
          payout_method: string | null;
          require_donation: boolean | null;
          season_id: string;
          status: Database['public']['Enums']['league_status'] | null;
          updated_at: string | null;
        };
        Insert: {
          code: string;
          commissioner_id: string;
          created_at?: string | null;
          donation_amount?: number | null;
          donation_notes?: string | null;
          draft_completed_at?: string | null;
          draft_order?: Json | null;
          draft_started_at?: string | null;
          draft_status?: Database['public']['Enums']['draft_status'] | null;
          id?: string;
          is_global?: boolean | null;
          is_public?: boolean | null;
          max_players?: number | null;
          name: string;
          password_hash?: string | null;
          payout_method?: string | null;
          require_donation?: boolean | null;
          season_id: string;
          status?: Database['public']['Enums']['league_status'] | null;
          updated_at?: string | null;
        };
        Update: {
          code?: string;
          commissioner_id?: string;
          created_at?: string | null;
          donation_amount?: number | null;
          donation_notes?: string | null;
          draft_completed_at?: string | null;
          draft_order?: Json | null;
          draft_started_at?: string | null;
          draft_status?: Database['public']['Enums']['draft_status'] | null;
          id?: string;
          is_global?: boolean | null;
          is_public?: boolean | null;
          max_players?: number | null;
          name?: string;
          password_hash?: string | null;
          payout_method?: string | null;
          require_donation?: boolean | null;
          season_id?: string;
          status?: Database['public']['Enums']['league_status'] | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'leagues_commissioner_id_fkey';
            columns: ['commissioner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leagues_season_id_fkey';
            columns: ['season_id'];
            isOneToOne: false;
            referencedRelation: 'seasons';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_preferences: {
        Row: {
          created_at: string | null;
          email_results: boolean | null;
          push_results: boolean | null;
          sms_results: boolean | null;
          spoiler_delay_hours: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          email_results?: boolean | null;
          push_results?: boolean | null;
          sms_results?: boolean | null;
          spoiler_delay_hours?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          email_results?: boolean | null;
          push_results?: boolean | null;
          sms_results?: boolean | null;
          spoiler_delay_hours?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          id: string;
          metadata: Json | null;
          read_at: string | null;
          scheduled_for: string | null;
          sent_at: string | null;
          spoiler_safe: boolean | null;
          subject: string | null;
          type: Database['public']['Enums']['notification_type'];
          user_id: string;
        };
        Insert: {
          body: string;
          id?: string;
          metadata?: Json | null;
          read_at?: string | null;
          scheduled_for?: string | null;
          sent_at?: string | null;
          spoiler_safe?: boolean | null;
          subject?: string | null;
          type: Database['public']['Enums']['notification_type'];
          user_id: string;
        };
        Update: {
          body?: string;
          id?: string;
          metadata?: Json | null;
          read_at?: string | null;
          scheduled_for?: string | null;
          sent_at?: string | null;
          spoiler_safe?: boolean | null;
          subject?: string | null;
          type?: Database['public']['Enums']['notification_type'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string | null;
          currency: string | null;
          id: string;
          league_id: string;
          refunded_at: string | null;
          status: Database['public']['Enums']['payment_status'] | null;
          stripe_payment_intent_id: string | null;
          stripe_refund_id: string | null;
          stripe_session_id: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          league_id: string;
          refunded_at?: string | null;
          status?: Database['public']['Enums']['payment_status'] | null;
          stripe_payment_intent_id?: string | null;
          stripe_refund_id?: string | null;
          stripe_session_id?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          league_id?: string;
          refunded_at?: string | null;
          status?: Database['public']['Enums']['payment_status'] | null;
          stripe_payment_intent_id?: string | null;
          stripe_refund_id?: string | null;
          stripe_session_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      results_tokens: {
        Row: {
          created_at: string | null;
          episode_id: string;
          expires_at: string;
          id: string;
          token: string;
          used_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          episode_id: string;
          expires_at: string;
          id?: string;
          token: string;
          used_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          episode_id?: string;
          expires_at?: string;
          id?: string;
          token?: string;
          used_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'results_tokens_episode_id_fkey';
            columns: ['episode_id'];
            isOneToOne: false;
            referencedRelation: 'episodes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'results_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      rosters: {
        Row: {
          acquired_at: string | null;
          acquired_via: string | null;
          castaway_id: string;
          draft_pick: number;
          draft_round: number;
          dropped_at: string | null;
          id: string;
          league_id: string;
          user_id: string;
        };
        Insert: {
          acquired_at?: string | null;
          acquired_via?: string | null;
          castaway_id: string;
          draft_pick: number;
          draft_round: number;
          dropped_at?: string | null;
          id?: string;
          league_id: string;
          user_id: string;
        };
        Update: {
          acquired_at?: string | null;
          acquired_via?: string | null;
          castaway_id?: string;
          draft_pick?: number;
          draft_round?: number;
          dropped_at?: string | null;
          id?: string;
          league_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rosters_castaway_id_fkey';
            columns: ['castaway_id'];
            isOneToOne: false;
            referencedRelation: 'castaways';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rosters_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rosters_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      scoring_rules: {
        Row: {
          category: string | null;
          code: string;
          created_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          is_negative: boolean | null;
          name: string;
          points: number;
          season_id: string | null;
          sort_order: number | null;
          updated_at: string | null;
        };
        Insert: {
          category?: string | null;
          code: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_negative?: boolean | null;
          name: string;
          points: number;
          season_id?: string | null;
          sort_order?: number | null;
          updated_at?: string | null;
        };
        Update: {
          category?: string | null;
          code?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_negative?: boolean | null;
          name?: string;
          points?: number;
          season_id?: string | null;
          sort_order?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'scoring_rules_season_id_fkey';
            columns: ['season_id'];
            isOneToOne: false;
            referencedRelation: 'seasons';
            referencedColumns: ['id'];
          },
        ];
      };
      scoring_sessions: {
        Row: {
          episode_id: string;
          finalized_at: string | null;
          finalized_by: string | null;
          id: string;
          started_at: string | null;
          status: Database['public']['Enums']['scoring_session_status'] | null;
        };
        Insert: {
          episode_id: string;
          finalized_at?: string | null;
          finalized_by?: string | null;
          id?: string;
          started_at?: string | null;
          status?: Database['public']['Enums']['scoring_session_status'] | null;
        };
        Update: {
          episode_id?: string;
          finalized_at?: string | null;
          finalized_by?: string | null;
          id?: string;
          started_at?: string | null;
          status?: Database['public']['Enums']['scoring_session_status'] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'scoring_sessions_episode_id_fkey';
            columns: ['episode_id'];
            isOneToOne: true;
            referencedRelation: 'episodes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scoring_sessions_finalized_by_fkey';
            columns: ['finalized_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      seasons: {
        Row: {
          created_at: string | null;
          draft_deadline: string;
          draft_order_deadline: string;
          finale_at: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          number: number;
          premiere_at: string;
          registration_closes_at: string;
          registration_opens_at: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          draft_deadline: string;
          draft_order_deadline: string;
          finale_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          number: number;
          premiere_at: string;
          registration_closes_at: string;
          registration_opens_at: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          draft_deadline?: string;
          draft_order_deadline?: string;
          finale_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          number?: number;
          premiere_at?: string;
          registration_closes_at?: string;
          registration_opens_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      sms_commands: {
        Row: {
          command: string;
          id: string;
          parsed_data: Json | null;
          phone: string;
          processed_at: string | null;
          raw_message: string;
          response_sent: string | null;
          user_id: string | null;
        };
        Insert: {
          command: string;
          id?: string;
          parsed_data?: Json | null;
          phone: string;
          processed_at?: string | null;
          raw_message: string;
          response_sent?: string | null;
          user_id?: string | null;
        };
        Update: {
          command?: string;
          id?: string;
          parsed_data?: Json | null;
          phone?: string;
          processed_at?: string | null;
          raw_message?: string;
          response_sent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sms_commands_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          display_name: string;
          email: string;
          id: string;
          notification_email: boolean | null;
          notification_push: boolean | null;
          notification_sms: boolean | null;
          phone: string | null;
          phone_verified: boolean | null;
          role: Database['public']['Enums']['user_role'] | null;
          timezone: string | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          display_name: string;
          email: string;
          id: string;
          notification_email?: boolean | null;
          notification_push?: boolean | null;
          notification_sms?: boolean | null;
          phone?: string | null;
          phone_verified?: boolean | null;
          role?: Database['public']['Enums']['user_role'] | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          display_name?: string;
          email?: string;
          id?: string;
          notification_email?: boolean | null;
          notification_push?: boolean | null;
          notification_sms?: boolean | null;
          phone?: string | null;
          phone_verified?: boolean | null;
          role?: Database['public']['Enums']['user_role'] | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      waiver_rankings: {
        Row: {
          episode_id: string;
          id: string;
          league_id: string;
          rankings: Json;
          submitted_at: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          episode_id: string;
          id?: string;
          league_id: string;
          rankings: Json;
          submitted_at?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          episode_id?: string;
          id?: string;
          league_id?: string;
          rankings?: Json;
          submitted_at?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'waiver_rankings_episode_id_fkey';
            columns: ['episode_id'];
            isOneToOne: false;
            referencedRelation: 'episodes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'waiver_rankings_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'waiver_rankings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      waiver_results: {
        Row: {
          acquired_castaway_id: string | null;
          dropped_castaway_id: string | null;
          episode_id: string;
          id: string;
          league_id: string;
          processed_at: string | null;
          user_id: string;
          waiver_position: number;
        };
        Insert: {
          acquired_castaway_id?: string | null;
          dropped_castaway_id?: string | null;
          episode_id: string;
          id?: string;
          league_id: string;
          processed_at?: string | null;
          user_id: string;
          waiver_position: number;
        };
        Update: {
          acquired_castaway_id?: string | null;
          dropped_castaway_id?: string | null;
          episode_id?: string;
          id?: string;
          league_id?: string;
          processed_at?: string | null;
          user_id?: string;
          waiver_position?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'waiver_results_acquired_castaway_id_fkey';
            columns: ['acquired_castaway_id'];
            isOneToOne: false;
            referencedRelation: 'castaways';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'waiver_results_dropped_castaway_id_fkey';
            columns: ['dropped_castaway_id'];
            isOneToOne: false;
            referencedRelation: 'castaways';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'waiver_results_episode_id_fkey';
            columns: ['episode_id'];
            isOneToOne: false;
            referencedRelation: 'episodes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'waiver_results_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'waiver_results_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      weekly_picks: {
        Row: {
          castaway_id: string | null;
          created_at: string | null;
          episode_id: string;
          id: string;
          league_id: string;
          locked_at: string | null;
          picked_at: string | null;
          points_earned: number | null;
          status: Database['public']['Enums']['pick_status'] | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          castaway_id?: string | null;
          created_at?: string | null;
          episode_id: string;
          id?: string;
          league_id: string;
          locked_at?: string | null;
          picked_at?: string | null;
          points_earned?: number | null;
          status?: Database['public']['Enums']['pick_status'] | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          castaway_id?: string | null;
          created_at?: string | null;
          episode_id?: string;
          id?: string;
          league_id?: string;
          locked_at?: string | null;
          picked_at?: string | null;
          points_earned?: number | null;
          status?: Database['public']['Enums']['pick_status'] | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'weekly_picks_castaway_id_fkey';
            columns: ['castaway_id'];
            isOneToOne: false;
            referencedRelation: 'castaways';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'weekly_picks_episode_id_fkey';
            columns: ['episode_id'];
            isOneToOne: false;
            referencedRelation: 'episodes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'weekly_picks_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'weekly_picks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      call_edge_function: {
        Args: {
          function_name: string;
          request_body?: Json;
          request_path?: string;
        };
        Returns: undefined;
      };
      check_scoring_completeness: {
        Args: { p_episode_id: string };
        Returns: {
          is_complete: boolean;
          scored_castaways: number;
          total_castaways: number;
          unscored_castaway_ids: string[];
          unscored_castaway_names: string[];
        }[];
      };
      finalize_episode_scoring: {
        Args: { p_episode_id: string; p_finalized_by: string };
        Returns: {
          eliminated_castaway_ids: string[];
          error_code: string;
          error_message: string;
          finalized: boolean;
          standings_updated: boolean;
        }[];
      };
      generate_league_code: { Args: never; Returns: string };
      get_global_leaderboard_stats: {
        Args: never;
        Returns: {
          avatar_url: string;
          average_points: number;
          display_name: string;
          has_eliminated_castaway: boolean;
          league_count: number;
          total_points: number;
          user_id: string;
        }[];
      };
      get_snake_picker_index: {
        Args: { p_pick_number: number; p_total_members: number };
        Returns: {
          picker_index: number;
          round: number;
        }[];
      };
      is_admin: { Args: never; Returns: boolean };
      is_commissioner: { Args: { league_uuid: string }; Returns: boolean };
      is_league_member: { Args: { league_uuid: string }; Returns: boolean };
      process_league_payment: {
        Args: {
          p_amount: number;
          p_currency: string;
          p_league_id: string;
          p_payment_intent_id: string;
          p_session_id: string;
          p_user_id: string;
        };
        Returns: {
          membership_id: string;
          payment_id: string;
        }[];
      };
      submit_draft_pick: {
        Args: {
          p_castaway_id: string;
          p_idempotency_token?: string;
          p_league_id: string;
          p_user_id: string;
        };
        Returns: {
          draft_pick: number;
          draft_round: number;
          error_code: string;
          error_message: string;
          is_draft_complete: boolean;
          next_picker_user_id: string;
          roster_id: string;
        }[];
      };
      test_buggy_snake: {
        Args: { p_pick_number: number; p_total_members: number };
        Returns: {
          picker_index: number;
          round: number;
        }[];
      };
    };
    Enums: {
      castaway_status: 'active' | 'eliminated' | 'winner';
      draft_status: 'pending' | 'in_progress' | 'completed';
      league_status: 'forming' | 'drafting' | 'active' | 'completed';
      notification_type: 'email' | 'sms' | 'push';
      payment_status: 'pending' | 'completed' | 'refunded' | 'failed';
      pick_status: 'pending' | 'locked' | 'auto_picked';
      scoring_session_status: 'draft' | 'finalized';
      user_role: 'player' | 'commissioner' | 'admin';
      waiver_status: 'open' | 'closed' | 'processing';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      castaway_status: ['active', 'eliminated', 'winner'],
      draft_status: ['pending', 'in_progress', 'completed'],
      league_status: ['forming', 'drafting', 'active', 'completed'],
      notification_type: ['email', 'sms', 'push'],
      payment_status: ['pending', 'completed', 'refunded', 'failed'],
      pick_status: ['pending', 'locked', 'auto_picked'],
      scoring_session_status: ['draft', 'finalized'],
      user_role: ['player', 'commissioner', 'admin'],
      waiver_status: ['open', 'closed', 'processing'],
    },
  },
} as const;
