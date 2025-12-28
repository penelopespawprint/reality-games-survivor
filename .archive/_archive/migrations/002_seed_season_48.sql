-- ============================================
-- RGFL Season 48 Setup
-- ============================================
-- Creates the Official League for Season 48
-- Run AFTER 001_upgrade_to_multi_league.sql
-- ============================================

-- Create Official Season 48 League
INSERT INTO "League" (
    "id",
    "name",
    "code",
    "type",
    "description",
    "isPasswordProtected",
    "maxPlayers",
    "currentPlayers",
    "status",
    "isAdminOnly",
    "draftStatus",
    "picksPerUser",
    "createdAt",
    "updatedAt"
) VALUES (
    'season-48-official',
    'Survivor 48 - Official League',
    'S48OFFICIAL',
    'OFFICIAL',
    'The official RGFL league for Survivor Season 48. Join to compete against all players!',
    false,
    1000,
    0,
    'OPEN',
    false,
    'PENDING',
    2,
    NOW(),
    NOW()
) ON CONFLICT ("code") DO NOTHING;

-- Verify
SELECT 'Season 48 Official League created:' as status;
SELECT "id", "name", "code", "type", "status" FROM "League" WHERE "code" = 'S48OFFICIAL';
