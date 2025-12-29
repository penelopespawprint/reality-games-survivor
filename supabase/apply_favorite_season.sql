-- Combined SQL to add favorite_season column and track migration
-- Safe to run multiple times - uses IF NOT EXISTS checks

-- Add favorite_season column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_season TEXT;

-- Ensure the migrations tracking schema exists
CREATE SCHEMA IF NOT EXISTS supabase_migrations;

-- Ensure the migrations tracking table exists (Supabase creates this automatically, but ensure it exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'supabase_migrations' 
        AND table_name = 'schema_migrations'
    ) THEN
        -- Supabase's schema_migrations table only has 'version' column
        CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
            version TEXT PRIMARY KEY
        );
    END IF;
END $$;

-- Mark this migration as applied if not already tracked
-- Only insert version column (no inserted_at)
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('045_add_favorite_season_to_users')
ON CONFLICT (version) DO NOTHING;
