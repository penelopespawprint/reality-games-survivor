-- Seed script for multi-league system
-- Creates Borneo League (Official League 1) and basic test data

BEGIN;

-- Create the first Official League: Borneo League
INSERT INTO "League" (id, name, code, type, "maxPlayers", "currentPlayers", status, "createdBy", "isAdminOnly", "draftStatus", "picksPerUser", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Borneo League',
  'BORNEO-2024',
  'OFFICIAL',
  18,
  0,
  'OPEN',
  NULL,
  false,
  'PENDING',
  2,
  NOW(),
  NOW()
)
RETURNING id;

-- Store the league ID for reference
DO $$
DECLARE
  borneo_league_id text;
BEGIN
  SELECT id INTO borneo_league_id FROM "League" WHERE code = 'BORNEO-2024';

  -- Create test admin user
  INSERT INTO "User" (id, email, name, "isAdmin", password, "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    'admin@rgfl.com',
    'Admin User',
    true,
    '$2b$10$YourHashedPasswordHere', -- You'll need to hash this properly
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO NOTHING;

  -- Create 18 test castaways for Survivor 49
  INSERT INTO "Castaway" (id, name, number, tribe, occupation, age, hometown, eliminated, "eliminatedWeek", "createdAt", "updatedAt")
  VALUES
    (gen_random_uuid()::text, 'Steven Ramm', 1, 'Solewa', 'Financial Advisor', 30, 'San Diego, CA', false, NULL, NOW(), NOW()),
    (gen_random_uuid()::text, 'Sage Ahrens-Nichols', 2, 'Solewa', 'Brand Manager', 28, 'Portland, OR', false, NULL, NOW(), NOW()),
    (gen_random_uuid()::text, 'Jason Treul', 3, 'Solewa', 'Firefighter', 35, 'Chicago, IL', false, NULL, NOW(), NOW()),
    (gen_random_uuid()::text, 'Kristina Mills', 4, 'Solewa', 'Teacher', 32, 'Austin, TX', false, NULL, NOW(), NOW()),
    (gen_random_uuid()::text, 'Rizo Velovic', 5, 'Solewa', 'Entrepreneur', 29, 'Miami, FL', false, NULL, NOW(), NOW()),
    (gen_random_uuid()::text, 'Sophie Segreti', 6, 'Solewa', 'Nurse', 27, 'Boston, MA', false, NULL, NOW(), NOW()),
    (gen_random_uuid()::text, 'Sophi Balerdi', 7, 'Solewa', 'Marketing Director', 31, 'Denver, CO', false, NULL, NOW(), NOW()),
    (gen_random_uuid()::text, 'Savannah Louie', 8, 'Solewa', 'Real Estate Agent', 26, 'Seattle, WA', false, NULL, NOW(), NOW()),
    -- Eliminated castaways
    (gen_random_uuid()::text, 'Nicole Mazullo', 9, 'Kele', 'Attorney', 34, 'New York, NY', true, 1, NOW(), NOW()),
    (gen_random_uuid()::text, 'Kimberly "Annie" Davis', 10, 'Hina', 'Police Officer', 33, 'Phoenix, AZ', true, 2, NOW(), NOW()),
    (gen_random_uuid()::text, 'Matt Williams', 11, 'Uli', 'Software Engineer', 29, 'San Francisco, CA', true, 3, NOW(), NOW()),
    (gen_random_uuid()::text, 'Jake Latimer', 12, 'Kele', 'Sales Manager', 31, 'Dallas, TX', true, 3, NOW(), NOW()),
    (gen_random_uuid()::text, 'Jeremiah Ing', 13, 'Hina', 'Chef', 28, 'Los Angeles, CA', true, 4, NOW(), NOW()),
    (gen_random_uuid()::text, 'Shannon Fairweather', 14, 'Uli', 'Accountant', 30, 'Atlanta, GA', true, 6, NOW(), NOW()),
    (gen_random_uuid()::text, 'Nate Moore', 15, 'Kele', 'Personal Trainer', 27, 'Nashville, TN', true, 7, NOW(), NOW()),
    (gen_random_uuid()::text, 'Michelle "MC" Chukwujekwu', 16, 'Hina', 'Consultant', 32, 'Washington, DC', true, 8, NOW(), NOW()),
    (gen_random_uuid()::text, 'Alex Moore', 17, 'Uli', 'Graphic Designer', 26, 'Philadelphia, PA', true, 9, NOW(), NOW()),
    (gen_random_uuid()::text, 'Jawan Pitts', 18, 'Solewa', 'Project Manager', 29, 'Houston, TX', true, 10, NOW(), NOW())
  ON CONFLICT (number) DO NOTHING;

  -- Create weeks 1-13
  INSERT INTO "Week" (id, "weekNumber", "isActive", "picksOpenAt", "picksCloseAt", "createdAt", "updatedAt")
  SELECT
    gen_random_uuid()::text,
    week_num,
    CASE WHEN week_num = 10 THEN true ELSE false END,
    NOW() - INTERVAL '7 days' * (13 - week_num),
    NOW() - INTERVAL '7 days' * (13 - week_num) + INTERVAL '6 days',
    NOW(),
    NOW()
  FROM generate_series(1, 13) AS week_num
  ON CONFLICT DO NOTHING;

END $$;

COMMIT;

-- Verification queries
SELECT 'Leagues created:' as info, COUNT(*) as count FROM "League";
SELECT 'Castaways created:' as info, COUNT(*) as count FROM "Castaway";
SELECT 'Weeks created:' as info, COUNT(*) as count FROM "Week";
SELECT 'Active week:' as info, "weekNumber" FROM "Week" WHERE "isActive" = true;
