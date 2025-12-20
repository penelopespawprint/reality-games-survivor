// Generated types for Supabase - run `npx supabase gen types typescript` to regenerate
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
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
          created_at?: string;
          updated_at?: string;
        };
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
      };
      // Add more tables as needed - this is a starting subset
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: 'player' | 'commissioner' | 'admin';
      league_status: 'forming' | 'drafting' | 'active' | 'completed';
      draft_status: 'pending' | 'in_progress' | 'completed';
      castaway_status: 'active' | 'eliminated' | 'winner';
    };
  };
}
