-- ============================================
-- APPLY ALL MISSING MIGRATIONS
-- Combines 19 missing migrations into one script
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================

-- Ensure migrations table exists
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
    version TEXT PRIMARY KEY
);

-- ============================================
-- 003_commissioner_features
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '003_commissioner_features') THEN
        -- Add description column to leagues
        ALTER TABLE leagues ADD COLUMN IF NOT EXISTS description TEXT;
        
        -- Add is_closed column
        ALTER TABLE leagues ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT FALSE;
        
        -- Add co-commissioners support
        ALTER TABLE leagues ADD COLUMN IF NOT EXISTS co_commissioners JSONB DEFAULT '[]';
        
        -- Create index for co-commissioners lookup
        CREATE INDEX IF NOT EXISTS idx_leagues_co_commissioners ON leagues USING GIN (co_commissioners);
        
        -- Helper function
        CREATE OR REPLACE FUNCTION is_commissioner_or_co(league_uuid UUID)
        RETURNS BOOLEAN AS $function$
        DECLARE
          league_rec RECORD;
        BEGIN
          SELECT commissioner_id, co_commissioners INTO league_rec
          FROM leagues WHERE id = league_uuid;
        
          IF league_rec IS NULL THEN
            RETURN FALSE;
          END IF;
        
          IF league_rec.commissioner_id = auth.uid() THEN
            RETURN TRUE;
          END IF;
        
          IF league_rec.co_commissioners ? auth.uid()::text THEN
            RETURN TRUE;
          END IF;
        
          RETURN FALSE;
        END;
        $function$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
        
        -- Update RLS policies
        DROP POLICY IF EXISTS leagues_update_commissioner ON leagues;
        CREATE POLICY leagues_update_commissioner ON leagues
          FOR UPDATE USING (is_commissioner_or_co(id));
        
        DROP POLICY IF EXISTS league_members_delete_commissioner ON league_members;
        CREATE POLICY league_members_delete_commissioner ON league_members
          FOR DELETE USING (is_commissioner_or_co(league_id));
        
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('003_commissioner_features');
        RAISE NOTICE 'Applied: 003_commissioner_features';
    END IF;
END $$;

-- ============================================
-- 005_announcements
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '005_announcements') THEN
        CREATE TABLE IF NOT EXISTS announcements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'info',
          is_active BOOLEAN DEFAULT TRUE,
          starts_at TIMESTAMPTZ DEFAULT NOW(),
          expires_at TIMESTAMPTZ,
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, starts_at, expires_at);
        
        ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS announcements_select_active ON announcements;
        CREATE POLICY announcements_select_active ON announcements
          FOR SELECT USING (
            is_active = true
            AND starts_at <= NOW()
            AND (expires_at IS NULL OR expires_at > NOW())
          );
        
        DROP POLICY IF EXISTS announcements_admin ON announcements;
        CREATE POLICY announcements_admin ON announcements
          FOR ALL USING (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
          );
        
        DROP POLICY IF EXISTS service_bypass_announcements ON announcements;
        CREATE POLICY service_bypass_announcements ON announcements
          FOR ALL USING (auth.role() = 'service_role');
        
        CREATE TRIGGER update_announcements_updated_at
          BEFORE UPDATE ON announcements
          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
        
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('005_announcements');
        RAISE NOTICE 'Applied: 005_announcements';
    END IF;
END $$;

-- ============================================
-- 006_user_profile_fields
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '006_user_profile_fields') THEN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS hometown TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_castaway TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
        
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('006_user_profile_fields');
        RAISE NOTICE 'Applied: 006_user_profile_fields';
    END IF;
END $$;

-- ============================================
-- 007_global_draft_rankings
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '007_global_draft_rankings') THEN
        CREATE TABLE IF NOT EXISTS draft_rankings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
          rankings JSONB NOT NULL,
          submitted_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, season_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_draft_rankings_user_season ON draft_rankings(user_id, season_id);
        
        ALTER TABLE draft_rankings ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS draft_rankings_select_own ON draft_rankings;
        CREATE POLICY draft_rankings_select_own ON draft_rankings FOR SELECT USING (user_id = auth.uid());
        
        DROP POLICY IF EXISTS draft_rankings_insert_own ON draft_rankings;
        CREATE POLICY draft_rankings_insert_own ON draft_rankings FOR INSERT WITH CHECK (user_id = auth.uid());
        
        DROP POLICY IF EXISTS draft_rankings_update_own ON draft_rankings;
        CREATE POLICY draft_rankings_update_own ON draft_rankings FOR UPDATE USING (user_id = auth.uid());
        
        DROP POLICY IF EXISTS draft_rankings_delete_own ON draft_rankings;
        CREATE POLICY draft_rankings_delete_own ON draft_rankings FOR DELETE USING (user_id = auth.uid());
        
        DROP POLICY IF EXISTS draft_rankings_admin ON draft_rankings;
        CREATE POLICY draft_rankings_admin ON draft_rankings FOR ALL USING (
          EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
        );
        
        DROP POLICY IF EXISTS service_bypass_draft_rankings ON draft_rankings;
        CREATE POLICY service_bypass_draft_rankings ON draft_rankings FOR ALL USING (auth.role() = 'service_role');
        
        CREATE TRIGGER update_draft_rankings_updated_at BEFORE UPDATE ON draft_rankings
          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
        
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('007_global_draft_rankings');
        RAISE NOTICE 'Applied: 007_global_draft_rankings';
    END IF;
END $$;

-- ============================================
-- 008_castaway_trivia
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '008_castaway_trivia') THEN
        ALTER TABLE castaways ADD COLUMN IF NOT EXISTS previous_seasons TEXT[];
        ALTER TABLE castaways ADD COLUMN IF NOT EXISTS best_placement INTEGER;
        ALTER TABLE castaways ADD COLUMN IF NOT EXISTS fun_fact TEXT;
        
        CREATE INDEX IF NOT EXISTS idx_castaways_best_placement ON castaways(best_placement) WHERE best_placement IS NOT NULL;
        
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('008_castaway_trivia');
        RAISE NOTICE 'Applied: 008_castaway_trivia';
    END IF;
END $$;

-- ============================================
-- 009_rank_tracking
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '009_rank_tracking') THEN
        ALTER TABLE league_members ADD COLUMN IF NOT EXISTS previous_rank INTEGER;
        
        CREATE OR REPLACE FUNCTION update_previous_ranks(league_uuid UUID)
        RETURNS VOID AS $function$
        BEGIN
          UPDATE league_members
          SET previous_rank = rank
          WHERE league_id = league_uuid;
        END;
        $function$ LANGUAGE plpgsql;
        
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('009_rank_tracking');
        RAISE NOTICE 'Applied: 009_rank_tracking';
    END IF;
END $$;

-- ============================================
-- 012_castaway_storage_photos
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '012_castaway_storage_photos') THEN
        -- This migration updates photo URLs - safe to skip if already done
        -- The actual storage_photo_path column is added in 011_castaway_photos
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('012_castaway_storage_photos');
        RAISE NOTICE 'Applied: 012_castaway_storage_photos (photo URL updates)';
    END IF;
END $$;

-- ============================================
-- 013_verification_codes
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '013_verification_codes') THEN
        CREATE TABLE IF NOT EXISTS verification_codes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          phone TEXT NOT NULL,
          code TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          used_at TIMESTAMPTZ,
          UNIQUE(user_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_verification_codes_user ON verification_codes(user_id);
        CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);
        
        ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS verification_codes_service ON verification_codes;
        CREATE POLICY verification_codes_service ON verification_codes
          FOR ALL USING (auth.role() = 'service_role');
        
        CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
        RETURNS void AS $function$
        BEGIN
          DELETE FROM verification_codes
          WHERE expires_at < NOW() - INTERVAL '1 hour';
        END;
        $function$ LANGUAGE plpgsql SECURITY DEFINER;
        
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('013_verification_codes');
        RAISE NOTICE 'Applied: 013_verification_codes';
    END IF;
END $$;

-- ============================================
-- 014_set_castaway_tribes
-- ============================================
DO $$
DECLARE
  season_50_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '014_set_castaway_tribes') THEN
        -- Check if tribe_original column exists, if not add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'castaways' AND column_name = 'tribe_original') THEN
            ALTER TABLE castaways ADD COLUMN tribe_original TEXT;
        END IF;
        
        -- Set tribes for Season 50 (safe to run multiple times)
        SELECT id INTO season_50_id FROM seasons WHERE number = 50;
        
        IF season_50_id IS NOT NULL THEN
            -- Vatu Tribe
            UPDATE castaways SET tribe_original = 'Vatu' WHERE season_id = season_50_id AND name = 'Rob Mariano';
            UPDATE castaways SET tribe_original = 'Vatu' WHERE season_id = season_50_id AND name = 'Sandra Diaz-Twine';
            UPDATE castaways SET tribe_original = 'Vatu' WHERE season_id = season_50_id AND name = 'Tony Vlachos';
            UPDATE castaways SET tribe_original = 'Vatu' WHERE season_id = season_50_id AND name = 'Cirie Fields';
            UPDATE castaways SET tribe_original = 'Vatu' WHERE season_id = season_50_id AND name = 'Tyson Apostol';
            UPDATE castaways SET tribe_original = 'Vatu' WHERE season_id = season_50_id AND name = 'Sarah Lacina';
            UPDATE castaways SET tribe_original = 'Vatu' WHERE season_id = season_50_id AND name = 'Ben Driebergen';
            UPDATE castaways SET tribe_original = 'Vatu' WHERE season_id = season_50_id AND name = 'Natalie Anderson';
            
            -- Kalo Tribe
            UPDATE castaways SET tribe_original = 'Kalo' WHERE season_id = season_50_id AND name = 'Parvati Shallow';
            UPDATE castaways SET tribe_original = 'Kalo' WHERE season_id = season_50_id AND name = 'Kim Spradlin-Wolfe';
            UPDATE castaways SET tribe_original = 'Kalo' WHERE season_id = season_50_id AND name = 'Jeremy Collins';
            UPDATE castaways SET tribe_original = 'Kalo' WHERE season_id = season_50_id AND name = 'Michele Fitzgerald';
            UPDATE castaways SET tribe_original = 'Kalo' WHERE season_id = season_50_id AND name = 'Wendell Holland';
            UPDATE castaways SET tribe_original = 'Kalo' WHERE season_id = season_50_id AND name = 'Sophie Clarke';
            UPDATE castaways SET tribe_original = 'Kalo' WHERE season_id = season_50_id AND name = 'Yul Kwon';
            UPDATE castaways SET tribe_original = 'Kalo' WHERE season_id = season_50_id AND name = 'Denise Stapley';
            
            -- Cila Tribe
            UPDATE castaways SET tribe_original = 'Cila' WHERE season_id = season_50_id AND name = 'Ethan Zohn';
            UPDATE castaways SET tribe_original = 'Cila' WHERE season_id = season_50_id AND name = 'Tina Wesson';
            UPDATE castaways SET tribe_original = 'Cila' WHERE season_id = season_50_id AND name = 'Earl Cole';
            UPDATE castaways SET tribe_original = 'Cila' WHERE season_id = season_50_id AND name = 'JT Thomas';
            UPDATE castaways SET tribe_original = 'Cila' WHERE season_id = season_50_id AND name = 'Vecepia Towery';
            UPDATE castaways SET tribe_original = 'Cila' WHERE season_id = season_50_id AND name = 'Danni Boatwright';
            UPDATE castaways SET tribe_original = 'Cila' WHERE season_id = season_50_id AND name = 'Adam Klein';
            UPDATE castaways SET tribe_original = 'Cila' WHERE season_id = season_50_id AND name = 'Nick Wilson';
        END IF;
        
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('014_set_castaway_tribes');
        RAISE NOTICE 'Applied: 014_set_castaway_tribes';
    END IF;
END $$;

-- ============================================
-- 015_update_castaway_images_from_storage
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '015_update_castaway_images_from_storage') THEN
        -- This migration updates photo URLs - safe to skip if already done
        -- The actual updates are data changes, not schema changes
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('015_update_castaway_images_from_storage');
        RAISE NOTICE 'Applied: 015_update_castaway_images_from_storage (photo URL updates)';
    END IF;
END $$;

-- ============================================
-- 020_leaderboard_indexes
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '020_leaderboard_indexes') THEN
        CREATE INDEX IF NOT EXISTS idx_league_members_points_desc
        ON league_members(league_id, total_points DESC);
        
        CREATE INDEX IF NOT EXISTS idx_league_members_user_points
        ON league_members(user_id, total_points);
        
        CREATE INDEX IF NOT EXISTS idx_rosters_league_user_active
        ON rosters(league_id, user_id, castaway_id)
        WHERE dropped_at IS NULL;
        
        CREATE INDEX IF NOT EXISTS idx_castaways_id_status
        ON castaways(id, status);
        
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('020_leaderboard_indexes');
        RAISE NOTICE 'Applied: 020_leaderboard_indexes';
    END IF;
END $$;

-- ============================================
-- 029_daily_trivia_tracking
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '029_daily_trivia_tracking') THEN
        CREATE TABLE IF NOT EXISTS daily_trivia_questions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          question_date DATE,
          question TEXT NOT NULL,
          options TEXT[] NOT NULL,
          correct_index INTEGER NOT NULL,
          fun_fact TEXT,
          castaway_name TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS daily_trivia_answers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          question_id UUID NOT NULL REFERENCES daily_trivia_questions(id) ON DELETE CASCADE,
          selected_index INTEGER NOT NULL,
          is_correct BOOLEAN NOT NULL,
          answered_at TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, question_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_daily_trivia_questions_date ON daily_trivia_questions(question_date DESC);
        CREATE INDEX IF NOT EXISTS idx_daily_trivia_answers_user_id ON daily_trivia_answers(user_id);
        CREATE INDEX IF NOT EXISTS idx_daily_trivia_answers_question_id ON daily_trivia_answers(question_id);
        CREATE INDEX IF NOT EXISTS idx_daily_trivia_answers_user_date ON daily_trivia_answers(user_id, answered_at DESC);
        
        CREATE OR REPLACE FUNCTION get_user_trivia_stats(p_user_id UUID)
        RETURNS TABLE (
          total_answered INTEGER,
          total_correct INTEGER,
          current_streak INTEGER,
          longest_streak INTEGER,
          perfect_days INTEGER
        ) AS $$
        BEGIN
          RETURN QUERY
          WITH user_answers AS (
            SELECT 
              dta.answered_at::DATE as answer_date,
              dta.is_correct,
              ROW_NUMBER() OVER (PARTITION BY dta.answered_at::DATE ORDER BY dta.answered_at DESC) as rn
            FROM daily_trivia_answers dta
            WHERE dta.user_id = p_user_id
          ),
          daily_results AS (
            SELECT 
              answer_date,
              is_correct,
              LAG(is_correct) OVER (ORDER BY answer_date) as prev_correct
            FROM user_answers
            WHERE rn = 1
          ),
          streaks AS (
            SELECT 
              answer_date,
              is_correct,
              SUM(CASE WHEN is_correct = prev_correct OR prev_correct IS NULL THEN 0 ELSE 1 END) 
                OVER (ORDER BY answer_date) as streak_group
            FROM daily_results
            WHERE is_correct = true
          )
          SELECT 
            (SELECT COUNT(*) FROM user_answers WHERE rn = 1)::INTEGER as total_answered,
            (SELECT COUNT(*) FROM user_answers WHERE rn = 1 AND is_correct = true)::INTEGER as total_correct,
            COALESCE((
              SELECT COUNT(*)::INTEGER
              FROM streaks
              WHERE streak_group = (SELECT MAX(streak_group) FROM streaks)
            ), 0) as current_streak,
            COALESCE((
              SELECT MAX(streak_count)::INTEGER
              FROM (
                SELECT COUNT(*) as streak_count
                FROM streaks
                GROUP BY streak_group
              ) sub
            ), 0) as longest_streak,
            (SELECT COUNT(*)::INTEGER FROM user_answers WHERE rn = 1 AND is_correct = true)::INTEGER as perfect_days;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        ALTER TABLE daily_trivia_questions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE daily_trivia_answers ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Anyone can read trivia questions" ON daily_trivia_questions;
        CREATE POLICY "Anyone can read trivia questions"
          ON daily_trivia_questions FOR SELECT
          USING (true);
        
        DROP POLICY IF EXISTS "Users can insert their own answers" ON daily_trivia_answers;
        CREATE POLICY "Users can insert their own answers"
          ON daily_trivia_answers FOR INSERT
          WITH CHECK (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS "Users can read their own answers" ON daily_trivia_answers;
        CREATE POLICY "Users can read their own answers"
          ON daily_trivia_answers FOR SELECT
          USING (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS "Admins can manage trivia questions" ON daily_trivia_questions;
        CREATE POLICY "Admins can manage trivia questions"
          ON daily_trivia_questions FOR ALL
          USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE id = auth.uid() AND role = 'admin'
            )
          );
        
        CREATE TABLE IF NOT EXISTS daily_trivia_leaderboard (
          user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          display_name TEXT NOT NULL,
          days_to_complete INTEGER NOT NULL,
          completed_at TIMESTAMPTZ NOT NULL,
          rank INTEGER GENERATED ALWAYS AS (
            ROW_NUMBER() OVER (ORDER BY days_to_complete ASC, completed_at ASC)
          ) STORED,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_daily_trivia_leaderboard_days ON daily_trivia_leaderboard(days_to_complete ASC, completed_at ASC);
        
        ALTER TABLE daily_trivia_leaderboard ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Anyone can read leaderboard" ON daily_trivia_leaderboard;
        CREATE POLICY "Anyone can read leaderboard"
          ON daily_trivia_leaderboard FOR SELECT
          USING (true);
        
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('029_daily_trivia_tracking');
        RAISE NOTICE 'Applied: 029_daily_trivia_tracking';
    END IF;
END $$;

-- ============================================
-- 030_trivia_completion_tracking
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '030_trivia_completion_tracking') THEN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS trivia_completed BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS trivia_completed_at TIMESTAMPTZ;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS trivia_score INTEGER;
        
        CREATE INDEX IF NOT EXISTS idx_users_trivia_completed ON users(trivia_completed) WHERE trivia_completed = true;
        
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('030_trivia_completion_tracking');
        RAISE NOTICE 'Applied: 030_trivia_completion_tracking';
    END IF;
END $$;

-- ============================================
-- 030_trivia_lockout_column
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '030_trivia_lockout_column') THEN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS trivia_lockout_until TIMESTAMPTZ;
        
        CREATE INDEX IF NOT EXISTS idx_users_trivia_lockout ON users(trivia_lockout_until) WHERE trivia_lockout_until IS NOT NULL;
        
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('030_trivia_lockout_column');
        RAISE NOTICE 'Applied: 030_trivia_lockout_column';
    END IF;
END $$;

-- ============================================
-- 030_trivia_lockout_system
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '030_trivia_lockout_system') THEN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS trivia_lockout_until TIMESTAMPTZ;
        
        CREATE TABLE IF NOT EXISTS trivia_answers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          question_index INTEGER NOT NULL CHECK (question_index >= 0 AND question_index < 24),
          is_correct BOOLEAN NOT NULL,
          answered_at TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, question_index)
        );
        
        CREATE INDEX IF NOT EXISTS idx_trivia_answers_user_id ON trivia_answers(user_id);
        CREATE INDEX IF NOT EXISTS idx_trivia_answers_question_index ON trivia_answers(question_index);
        CREATE INDEX IF NOT EXISTS idx_trivia_answers_user_answered ON trivia_answers(user_id, answered_at DESC);
        
        ALTER TABLE trivia_answers ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can insert their own answers" ON trivia_answers;
        CREATE POLICY "Users can insert their own answers"
          ON trivia_answers FOR INSERT
          WITH CHECK (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS "Users can read their own answers" ON trivia_answers;
        CREATE POLICY "Users can read their own answers"
          ON trivia_answers FOR SELECT
          USING (auth.uid() = user_id);
        
        CREATE OR REPLACE FUNCTION is_user_trivia_locked_out(p_user_id UUID)
        RETURNS BOOLEAN AS $function$
        DECLARE
          lockout_time TIMESTAMPTZ;
        BEGIN
          SELECT trivia_lockout_until INTO lockout_time
          FROM users
          WHERE id = p_user_id;
          
          IF lockout_time IS NULL THEN
            RETURN FALSE;
          END IF;
          
          RETURN lockout_time > NOW();
        END;
        $function$ LANGUAGE plpgsql SECURITY DEFINER;
        
        CREATE OR REPLACE FUNCTION get_user_trivia_progress(p_user_id UUID)
        RETURNS TABLE (
          total_answered INTEGER,
          total_correct INTEGER,
          is_locked_out BOOLEAN,
          lockout_until TIMESTAMPTZ,
          answered_questions INTEGER[]
        ) AS $function$
        BEGIN
          RETURN QUERY
          WITH user_answers AS (
            SELECT question_index, is_correct
            FROM trivia_answers
            WHERE user_id = p_user_id
          ),
          user_lockout AS (
            SELECT trivia_lockout_until
            FROM users
            WHERE id = p_user_id
          )
          SELECT 
            (SELECT COUNT(*) FROM user_answers)::INTEGER as total_answered,
            (SELECT COUNT(*) FROM user_answers WHERE is_correct = true)::INTEGER as total_correct,
            COALESCE((SELECT (trivia_lockout_until > NOW()) FROM user_lockout), false) as is_locked_out,
            (SELECT trivia_lockout_until FROM user_lockout) as lockout_until,
            (SELECT ARRAY_AGG(question_index ORDER BY question_index) FROM user_answers) as answered_questions;
        END;
        $function$ LANGUAGE plpgsql SECURITY DEFINER;
        
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('030_trivia_lockout_system');
        RAISE NOTICE 'Applied: 030_trivia_lockout_system';
    END IF;
END $$;

-- ============================================
-- 031_trivia_24_questions_lockout
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '031_trivia_24_questions_lockout') THEN
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS trivia_locked_until TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS trivia_questions_answered INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS trivia_questions_correct INTEGER DEFAULT 0;
        
        -- Remove unique constraint on question_date if it exists
        ALTER TABLE daily_trivia_questions 
        DROP CONSTRAINT IF EXISTS daily_trivia_questions_question_date_key;
        
        ALTER TABLE daily_trivia_questions
        ADD COLUMN IF NOT EXISTS question_number INTEGER;
        
        CREATE INDEX IF NOT EXISTS idx_daily_trivia_questions_number ON daily_trivia_questions(question_number ASC);
        
        CREATE OR REPLACE FUNCTION is_user_trivia_locked(p_user_id UUID)
        RETURNS TABLE (is_user_trivia_locked BOOLEAN) AS $function$
        DECLARE
          locked_until TIMESTAMPTZ;
          is_locked BOOLEAN;
        BEGIN
          SELECT trivia_locked_until INTO locked_until
          FROM users
          WHERE id = p_user_id;
          
          IF locked_until IS NULL THEN
            is_locked := FALSE;
          ELSIF locked_until > NOW() THEN
            is_locked := TRUE;
          ELSE
            UPDATE users SET trivia_locked_until = NULL WHERE id = p_user_id;
            is_locked := FALSE;
          END IF;
          
          RETURN QUERY SELECT is_locked;
        END;
        $function$ LANGUAGE plpgsql SECURITY DEFINER;
        
        CREATE OR REPLACE FUNCTION get_next_trivia_question(p_user_id UUID)
        RETURNS TABLE (
          id UUID,
          question_number INTEGER,
          question TEXT,
          options TEXT[],
          correct_index INTEGER,
          fun_fact TEXT
        ) AS $function$
        BEGIN
          RETURN QUERY
          SELECT 
            dtq.id,
            dtq.question_number,
            dtq.question,
            dtq.options,
            dtq.correct_index,
            dtq.fun_fact
          FROM daily_trivia_questions dtq
          WHERE dtq.question_number IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 
              FROM daily_trivia_answers dta
              WHERE dta.user_id = p_user_id 
                AND dta.question_id = dtq.id
                AND dta.is_correct = true
            )
          ORDER BY dtq.question_number ASC
          LIMIT 1;
        END;
        $function$ LANGUAGE plpgsql SECURITY DEFINER;
        
        CREATE OR REPLACE FUNCTION get_trivia_progress(p_user_id UUID)
        RETURNS TABLE (
          total_questions INTEGER,
          questions_answered INTEGER,
          questions_correct INTEGER,
          is_locked BOOLEAN,
          locked_until TIMESTAMPTZ,
          is_complete BOOLEAN
        ) AS $function$
        DECLARE
          total_count INTEGER;
          answered_count INTEGER;
          correct_count INTEGER;
          locked BOOLEAN;
          locked_time TIMESTAMPTZ;
        BEGIN
          SELECT COUNT(*) INTO total_count
          FROM daily_trivia_questions
          WHERE question_number IS NOT NULL;
          
          SELECT COUNT(*) INTO answered_count
          FROM daily_trivia_answers dta
          JOIN daily_trivia_questions dtq ON dta.question_id = dtq.id
          WHERE dta.user_id = p_user_id
            AND dta.is_correct = true;
          
          SELECT COUNT(*) INTO correct_count
          FROM daily_trivia_answers dta
          JOIN daily_trivia_questions dtq ON dta.question_id = dtq.id
          WHERE dta.user_id = p_user_id
            AND dta.is_correct = true;
          
          SELECT trivia_locked_until INTO locked_time
          FROM users
          WHERE id = p_user_id;
          
          IF locked_time IS NULL THEN
            locked := FALSE;
          ELSIF locked_time > NOW() THEN
            locked := TRUE;
          ELSE
            UPDATE users SET trivia_locked_until = NULL WHERE id = p_user_id;
            locked := FALSE;
            locked_time := NULL;
          END IF;
          
          RETURN QUERY
          SELECT 
            total_count,
            answered_count,
            correct_count,
            locked,
            locked_time,
            (answered_count >= total_count)::BOOLEAN as is_complete;
        END;
        $function$ LANGUAGE plpgsql SECURITY DEFINER;
        
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('031_trivia_24_questions_lockout');
        RAISE NOTICE 'Applied: 031_trivia_24_questions_lockout';
    END IF;
END $$;

-- ============================================
-- 032_insert_trivia_questions
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '032_insert_trivia_questions') THEN
        -- Only insert if questions don't exist
        IF NOT EXISTS (SELECT 1 FROM daily_trivia_questions WHERE question_number IS NOT NULL LIMIT 1) THEN
            INSERT INTO daily_trivia_questions (question_number, question, options, correct_index, fun_fact) VALUES
            (1, 'Which Survivor 50 contestant holds the record for competing in the most seasons (including international)?', 
              ARRAY['Ozzy Lusth', 'Cirie Fields', 'Joe Anglim', 'Colby Donaldson'], 
              1, 'Cirie has played 5 times: Panama, Micronesia, HvV, Game Changers, and Australian Survivor'),
            (2, 'In David vs. Goliath (S37), what was the final jury vote when Nick Wilson won?', 
              ARRAY['7-3-0 (Nick-Mike-Angelina)', '6-2-2 (Nick-Mike-Angelina)', '5-3-2 (Nick-Mike-Angelina)', '8-0-0 (Nick unanimous)'], 
              0, 'Angelina received zero jury votes despite making it to Final Tribal Council'),
            (3, 'Which contestant was the LAST person standing from the infamous Ulong tribe in Palau?', 
              ARRAY['Tom Westman', 'Katie Gallagher', 'Stephenie LaGrossa', 'Bobby Jon Drinkard'], 
              2, 'Ulong lost every single immunity challenge, and Stephenie survived alone before being absorbed into Koror'),
            (4, 'How many individual immunity challenges did Savannah Louie win in Season 49?', 
              ARRAY['2', '3', '4', '5'], 
              2, 'Savannah tied the record for most immunity wins by a woman in a single season'),
            (5, 'Which Survivor 50 contestant collapsed during an immunity challenge due to exhaustion?', 
              ARRAY['Jonathan Young', 'Joe Anglim', 'Ozzy Lusth', 'Coach Wade'], 
              1, 'Joe collapsed on Day 32 of Cambodia after pushing himself to the limit'),
            (6, 'Genevieve Mushaluk was known in Season 47 for being the queen of what?', 
              ARRAY['Immunity wins', 'Blindsides', 'Finding idols', 'Social gameplay'], 
              1, 'Genevieve orchestrated multiple blindsides including the Kishan vote and Operation: Italy'),
            (7, 'Which two Survivor 50 contestants competed on the same original season and later got married?', 
              ARRAY['Ozzy Lusth & Amanda Kimmel', 'Joe Anglim & Sierra Dawn Thomas', 'Colby Donaldson & Jerri Manthey', 'Coach Wade & Debbie Beebe'], 
              1, 'Joe and Sierra met on Worlds Apart (S30) and married in 2019'),
            (8, 'Kyle Fraser won Survivor 48 with what final jury vote?', 
              ARRAY['7-1-0', '6-2-0', '5-2-1', '4-3-1'], 
              2, 'All three finalists (Kyle, Eva, Joe) received at least one vote - a rare occurrence'),
            (9, 'Tiffany Ervin was blindsided in Season 46 while holding what in her pocket?', 
              ARRAY['An extra vote', 'A hidden immunity idol', 'A fake idol', 'Shot in the dark'], 
              1, 'Tiffany was blindsided at Final 8 with an idol after Q exposed her advantage to the tribe'),
            (10, 'How many Hidden Immunity Idols did Rick Devens possess during Edge of Extinction (S38)?', 
              ARRAY['2', '3', '4', '5'], 
              2, 'Rick holds the record for most idols possessed in a single season with 4'),
            (11, 'In Australian Outback, Colby made a controversial decision at Final 3. What did he do?', 
              ARRAY['Kept the immunity necklace', 'Took Tina instead of Keith to Final 2', 'Refused to vote', 'Gave away his reward'], 
              1, 'Colby''s decision to take Tina cost him $1 million - she won 4-3'),
            (12, 'How many times has Ozzy Lusth competed on Survivor?', 
              ARRAY['2', '3', '4', '5'], 
              2, 'Ozzy played in Cook Islands, Micronesia, South Pacific, and Game Changers'),
            (13, 'What is Coach Wade''s self-proclaimed nickname?', 
              ARRAY['The Warrior', 'The Dragon Slayer', 'The Maestro', 'The Survivor'], 
              1, 'Coach''s eccentric personality and stories made him one of Survivor''s most memorable characters'),
            (14, 'In Kaôh Rōng, Aubry lost the final jury vote to which winner?', 
              ARRAY['Natalie Anderson', 'Michele Fitzgerald', 'Sarah Lacina', 'Wendell Holland'], 
              1, 'The jury vote was 5-2 in favor of Michele in one of Survivor''s most debated outcomes'),
            (15, 'What is Christian Hubicki''s profession outside of Survivor?', 
              ARRAY['Software Engineer', 'Robotics Scientist', 'Data Analyst', 'Math Teacher'], 
              1, 'Christian''s nerdy charm and puzzle-solving skills made him a fan favorite in David vs. Goliath'),
            (16, 'Mike White is known outside Survivor for creating which hit TV show?', 
              ARRAY['Succession', 'The White Lotus', 'Yellowjackets', 'The Bear'], 
              1, 'Mike finished 2nd on David vs. Goliath and later won multiple Emmys for The White Lotus'),
            (17, 'How many individual immunity challenges did Chrissy Hofbeck win in Heroes vs. Healers vs. Hustlers?', 
              ARRAY['2', '3', '4', '5'], 
              2, 'Chrissy tied the women''s record for immunity wins at the time with 4 necklaces'),
            (18, 'Jonathan Young was known in Season 42 for his dominance in what area?', 
              ARRAY['Puzzle solving', 'Physical challenges', 'Finding idols', 'Social manipulation'], 
              1, 'Jonathan''s incredible strength carried his tribe through the pre-merge challenges'),
            (19, 'Dee Valladares won Season 45 with what final jury vote?', 
              ARRAY['7-1-0', '6-2-0', '5-3-0', '4-3-1'], 
              2, 'Dee dominated Season 45 and is considered one of the best New Era winners'),
            (20, 'Emily Flippen was known early in Season 45 for being extremely:', 
              ARRAY['Strategic', 'Physical', 'Blunt and abrasive', 'Under the radar'], 
              2, 'Emily had one of the best redemption arcs, going from most disliked to respected player'),
            (21, 'Q Burdette became infamous in Season 46 for repeatedly doing what at Tribal Council?', 
              ARRAY['Refusing to vote', 'Asking to be voted out', 'Playing fake idols', 'Switching his vote last second'], 
              1, 'Q''s chaotic gameplay including asking to go home made him one of the most unpredictable players ever'),
            (22, 'Charlie Davis finished as runner-up in Season 46, losing to which winner?', 
              ARRAY['Maria Shrime Gonzalez', 'Kenzie Petty', 'Ben Katzman', 'Liz Wilcox'], 
              1, 'Charlie lost 5-3-0 despite being considered one of the best strategic players of the season'),
            (23, 'Kamilla Karthigesu was eliminated in Season 48 by losing what challenge?', 
              ARRAY['Final immunity', 'Firemaking', 'Rock draw', 'Shot in the dark'], 
              1, 'The jury confirmed Kamilla would have won if she made Final Tribal Council'),
            (24, 'Rizo Velovic holds what distinction as a Survivor contestant?', 
              ARRAY['First Gen Z winner', 'First Albanian-American contestant', 'Youngest male finalist', 'Most idols found by a rookie'], 
              1, 'Rizo, aka ''Rizgod,'' was a superfan who became the first Albanian-American on the show');
        END IF;
        
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('032_insert_trivia_questions');
        RAISE NOTICE 'Applied: 032_insert_trivia_questions';
    END IF;
END $$;

-- ============================================
-- 033_prevent_self_role_update
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '033_prevent_self_role_update') THEN
        DROP POLICY IF EXISTS users_update_own ON users;
        DROP POLICY IF EXISTS users_update_own_no_role ON users;
        
        CREATE POLICY users_update_own_profile ON users
          FOR UPDATE 
          USING (id = auth.uid())
          WITH CHECK (
            id = auth.uid() AND
            role = (SELECT role FROM users WHERE id = auth.uid())
          );
        
        CREATE OR REPLACE FUNCTION is_service_role()
        RETURNS boolean AS $$
        BEGIN
          RETURN current_setting('request.jwt.claims', true)::json->>'role' = 'service_role';
        EXCEPTION
          WHEN OTHERS THEN
            RETURN false;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('033_prevent_self_role_update');
        RAISE NOTICE 'Applied: 033_prevent_self_role_update';
    END IF;
END $$;

-- ============================================
-- 034_trivia_attempts_tracking
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '034_trivia_attempts_tracking') THEN
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS trivia_attempts INTEGER DEFAULT 0;
        
        ALTER TABLE daily_trivia_leaderboard
        ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 1;
        
        UPDATE daily_trivia_leaderboard SET attempts = 1 WHERE attempts IS NULL OR attempts = 0;
        
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('034_trivia_attempts_tracking');
        RAISE NOTICE 'Applied: 034_trivia_attempts_tracking';
    END IF;
END $$;

-- ============================================
-- SUMMARY
-- ============================================
SELECT 
    'Migration Summary' as status,
    COUNT(*) as total_migrations,
    STRING_AGG(version, ', ' ORDER BY version) as all_versions
FROM supabase_migrations.schema_migrations;
