-- ============================================
-- SEASON 50 SEED DATA
-- Reality Games Fantasy League - Survivor
-- ============================================

-- Clear existing Season 50 data (if any)
DELETE FROM episode_scores WHERE episode_id IN (SELECT id FROM episodes WHERE season_id IN (SELECT id FROM seasons WHERE number = 50));
DELETE FROM weekly_picks WHERE episode_id IN (SELECT id FROM episodes WHERE season_id IN (SELECT id FROM seasons WHERE number = 50));
DELETE FROM rosters WHERE castaway_id IN (SELECT id FROM castaways WHERE season_id IN (SELECT id FROM seasons WHERE number = 50));
DELETE FROM episodes WHERE season_id IN (SELECT id FROM seasons WHERE number = 50);
DELETE FROM castaways WHERE season_id IN (SELECT id FROM seasons WHERE number = 50);
DELETE FROM scoring_rules WHERE season_id IN (SELECT id FROM seasons WHERE number = 50);
DELETE FROM leagues WHERE season_id IN (SELECT id FROM seasons WHERE number = 50) AND is_global = false;
DELETE FROM seasons WHERE number = 50;

-- ============================================
-- CREATE SEASON 50
-- ============================================
INSERT INTO seasons (id, number, name, is_active, registration_opens_at, draft_order_deadline, registration_closes_at, premiere_at, draft_deadline, finale_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  50,
  'Survivor 50: In the Hands of the Fans',
  true,
  '2025-12-19 12:00:00-08',  -- Dec 19, 2025 12:00 PM PST
  '2026-01-05 12:00:00-08',  -- Jan 5, 2026 12:00 PM PST
  '2026-02-25 17:00:00-08',  -- Feb 25, 2026 5:00 PM PST
  '2026-02-25 20:00:00-08',  -- Feb 25, 2026 8:00 PM PST
  '2026-03-02 20:00:00-08',  -- Mar 2, 2026 8:00 PM PST
  '2026-05-27 20:00:00-07'   -- May 27, 2026 8:00 PM PDT
);

-- ============================================
-- CASTAWAYS (24 legendary players)
-- ============================================
INSERT INTO castaways (season_id, name, age, hometown, occupation, status, previous_seasons, best_placement, fun_fact, photo_url) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Rob Mariano', 48, 'Boston, MA', 'TV Personality', 'active',
  ARRAY['Marquesas (S4)', 'All-Stars (S8)', 'Heroes vs Villains (S20)', 'Redemption Island (S22)', 'Winners at War (S40)'],
  1, 'Proposed to Amber on the All-Stars finale, they married and have 4 daughters',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/rob-mariano.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sandra Diaz-Twine', 50, 'Stamford, CT', 'Military Veteran', 'active',
  ARRAY['Pearl Islands (S7)', 'Heroes vs Villains (S20)', 'Game Changers (S34)', 'Island of the Idols (S39)', 'Winners at War (S40)'],
  1, 'Only player to win Survivor twice, famous for "As long as it ain''t me" strategy',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/sandra-diaz-twine.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Tony Vlachos', 50, 'Jersey City, NJ', 'Police Officer', 'active',
  ARRAY['Cagayan (S28)', 'Game Changers (S34)', 'Winners at War (S40)'],
  1, 'Known for building spy shacks/bunkers to eavesdrop on tribemates',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/tony-vlachos.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Cirie Fields', 53, 'Jersey City, NJ', 'Nurse', 'active',
  ARRAY['Panama (S12)', 'Micronesia (S16)', 'Heroes vs Villains (S20)', 'Game Changers (S34)'],
  3, 'Started as someone "afraid to get off the couch," became one of the best to never win',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/cirie-fields.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Tyson Apostol', 45, 'Lindon, UT', 'Podcaster', 'active',
  ARRAY['Tocantins (S18)', 'Heroes vs Villains (S20)', 'Blood vs Water (S27)', 'Winners at War (S40)'],
  1, 'Professional cyclist who once voted himself out by mistake in Heroes vs Villains',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/tyson-apostol.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sarah Lacina', 40, 'Marion, IA', 'Police Officer', 'active',
  ARRAY['Cagayan (S28)', 'Game Changers (S34)', 'Winners at War (S40)'],
  1, 'First player to win the Game Changers season playing like a criminal instead of cop',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/sarah-lacina.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Ben Driebergen', 43, 'Boise, ID', 'Marine Veteran', 'active',
  ARRAY['Heroes vs Healers vs Hustlers (S35)', 'Winners at War (S40)'],
  1, 'Found 3 idols in his winning season, won fire-making challenge to reach Final 3',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/ben-driebergen.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Natalie Anderson', 38, 'Edgewater, NJ', 'Crossfit Trainer', 'active',
  ARRAY['San Juan del Sur (S29)', 'Winners at War (S40)'],
  1, 'Won San Juan del Sur after her twin sister Nadiya was voted out first',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/natalie-anderson.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Parvati Shallow', 42, 'Los Angeles, CA', 'TV Host', 'active',
  ARRAY['Cook Islands (S13)', 'Micronesia (S16)', 'Heroes vs Villains (S20)', 'Winners at War (S40)'],
  1, 'Pioneered the "Black Widow Brigade" alliance and flirting strategy',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/parvati-shallow.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Kim Spradlin-Wolfe', 42, 'San Antonio, TX', 'Interior Designer', 'active',
  ARRAY['One World (S24)', 'Winners at War (S40)'],
  1, 'Considered to have played the most dominant winning game ever in One World',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/kim-spradlin-wolfe.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Jeremy Collins', 46, 'Foxboro, MA', 'Firefighter', 'active',
  ARRAY['San Juan del Sur (S29)', 'Cambodia (S31)', 'Winners at War (S40)'],
  1, 'Won Cambodia by successfully playing his meat shield strategy',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/jeremy-collins.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Michele Fitzgerald', 34, 'Freehold, NJ', 'Social Media Manager', 'active',
  ARRAY['Kaoh Rong (S32)', 'Winners at War (S40)'],
  1, 'Won despite not receiving votes at final tribal until the winner reveal',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/michele-fitzgerald.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Wendell Holland', 39, 'Philadelphia, PA', 'Furniture Designer', 'active',
  ARRAY['Ghost Island (S36)', 'Winners at War (S40)'],
  1, 'Won Ghost Island in the first ever tie-breaker vote at Final Tribal Council',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/wendell-holland.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sophie Clarke', 34, 'Willsboro, NY', 'Healthcare Consultant', 'active',
  ARRAY['South Pacific (S23)', 'Winners at War (S40)'],
  1, 'Beat Coach in South Pacific by calling out his religious hypocrisy',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/sophie-clarke.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Yul Kwon', 49, 'San Mateo, CA', 'Tech Executive', 'active',
  ARRAY['Cook Islands (S13)', 'Winners at War (S40)'],
  1, 'Led the famous "Aitu Four" comeback from 4 vs 8 to win Cook Islands',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/yul-kwon.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Denise Stapley', 54, 'Cedar Rapids, IA', 'Therapist', 'active',
  ARRAY['Philippines (S25)', 'Winners at War (S40)'],
  1, 'Attended every single tribal council in Philippines and still won',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/denise-stapley.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Ethan Zohn', 51, 'Lexington, MA', 'Soccer Coach', 'active',
  ARRAY['Africa (S3)', 'All-Stars (S8)', 'Winners at War (S40)'],
  1, 'Cancer survivor who used his winnings to start Grassroot Soccer charity',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/ethan-zohn.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Tina Wesson', 62, 'Knoxville, TN', 'Personal Trainer', 'active',
  ARRAY['The Australian Outback (S2)', 'All-Stars (S8)', 'Blood vs Water (S27)'],
  1, 'First female winner of Survivor, returned with daughter Katie',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/tina-wesson.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Earl Cole', 55, 'Los Angeles, CA', 'Executive Recruiter', 'active',
  ARRAY['Fiji (S14)'],
  1, 'First unanimous winner in Survivor history, never watched the show before playing',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/earl-cole.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'JT Thomas', 39, 'Samson, AL', 'Cattle Rancher', 'active',
  ARRAY['Tocantins (S18)', 'Heroes vs Villains (S20)', 'Game Changers (S34)'],
  1, 'Won Tocantins with zero votes against him, infamous for giving idol to Russell',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/jt-thomas.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Vecepia Towery', 58, 'Portland, OR', 'Office Manager', 'active',
  ARRAY['Marquesas (S4)'],
  1, 'First African American winner of Survivor, known for her under-the-radar game',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/vecepia-towery.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Danni Boatwright', 50, 'Tonganoxie, KS', 'Sports Radio Host', 'active',
  ARRAY['Guatemala (S11)', 'Winners at War (S40)'],
  1, 'Won Guatemala while hiding her strategy from producers by speaking in code',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/danni-boatwright.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Adam Klein', 32, 'San Francisco, CA', 'Podcaster', 'active',
  ARRAY['Millennials vs Gen X (S33)', 'Winners at War (S40)'],
  1, 'Dedicated his win to his mother who passed away from lung cancer days after filming',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/adam-klein.jpg'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Nick Wilson', 35, 'Williamsburg, KY', 'Public Defender', 'active',
  ARRAY['David vs Goliath (S37)', 'Winners at War (S40)'],
  1, 'Named all his alliances after famous duos (Mason-Dixon, Rockstars, etc.)',
  'https://qxrgejdfxcvsfktgysop.supabase.co/storage/v1/object/public/castaways/nick-wilson.jpg');

-- ============================================
-- EPISODES (14 episodes for Season 50)
-- ============================================
INSERT INTO episodes (season_id, number, title, air_date, picks_lock_at, results_posted_at, is_finale) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 1, 'The Greatest Showdown Begins', '2026-02-25 20:00:00-08', '2026-02-25 15:00:00-08', '2026-02-27 12:00:00-08', false),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2, 'Legends Collide', '2026-03-04 20:00:00-08', '2026-03-04 15:00:00-08', '2026-03-06 12:00:00-08', false),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 3, 'Trust No One', '2026-03-11 20:00:00-08', '2026-03-11 15:00:00-08', '2026-03-13 12:00:00-08', false),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 4, 'Shifting Alliances', '2026-03-18 20:00:00-07', '2026-03-18 15:00:00-07', '2026-03-20 12:00:00-07', false),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 5, 'Swap Chaos', '2026-03-25 20:00:00-07', '2026-03-25 15:00:00-07', '2026-03-27 12:00:00-07', false),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 6, 'Merge Madness', '2026-04-01 20:00:00-07', '2026-04-01 15:00:00-07', '2026-04-03 12:00:00-07', false),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 7, 'Individual Immunity', '2026-04-08 20:00:00-07', '2026-04-08 15:00:00-07', '2026-04-10 12:00:00-07', false),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 8, 'Idol Frenzy', '2026-04-15 20:00:00-07', '2026-04-15 15:00:00-07', '2026-04-17 12:00:00-07', false),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9, 'Blindside Boulevard', '2026-04-22 20:00:00-07', '2026-04-22 15:00:00-07', '2026-04-24 12:00:00-07', false),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10, 'The Auction Returns', '2026-04-29 20:00:00-07', '2026-04-29 15:00:00-07', '2026-05-01 12:00:00-07', false),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 11, 'Endgame Begins', '2026-05-06 20:00:00-07', '2026-05-06 15:00:00-07', '2026-05-08 12:00:00-07', false),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 12, 'Family Visit', '2026-05-13 20:00:00-07', '2026-05-13 15:00:00-07', '2026-05-15 12:00:00-07', false),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 13, 'Final Four Frenzy', '2026-05-20 20:00:00-07', '2026-05-20 15:00:00-07', '2026-05-22 12:00:00-07', false),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 14, 'Reunion & Finale', '2026-05-27 20:00:00-07', '2026-05-27 15:00:00-07', '2026-05-29 12:00:00-07', true);

-- ============================================
-- SCORING RULES (Official RGFL Rules)
-- ============================================
INSERT INTO scoring_rules (season_id, code, name, description, points, category, is_negative, sort_order, is_active) VALUES

-- ============================================
-- PRE-MERGE TEAM REWARD AND IMMUNITY CHALLENGES
-- ============================================
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'PRE_TEAM_REWARD_WIN', 'Team Wins Reward (Pre-Merge)', 'Your player''s team wins a reward challenge (if three teams, get 1st or 2nd)', 1, 'Pre-Merge Challenges', false, 1, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'PRE_TEAM_IMMUNITY_WIN', 'Team Wins Immunity (Pre-Merge)', 'Your player''s team wins an immunity challenge (if three teams, get 1st or 2nd)', 1, 'Pre-Merge Challenges', false, 2, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'PRE_TEAM_COMBINED_WIN', 'Team Wins Combined Challenge (Pre-Merge)', 'Your player''s team wins a combined reward/immunity challenge (do not get double points)', 1, 'Pre-Merge Challenges', false, 3, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'PRE_TEAM_LAST_PLACE', 'Team Gets Last Place (Pre-Merge)', 'Your player''s team gets last place in an immunity, reward, or combined challenge', -1, 'Pre-Merge Challenges', true, 4, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'PRE_SIT_OUT', 'Sit Out Challenge (Pre-Merge)', 'Your player sits out of a reward, immunity or combined challenge', -1, 'Pre-Merge Challenges', true, 5, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'PRE_GIVE_UP_REWARD', 'Give Up Reward Chance (Pre-Merge)', 'Your player gives up their chance for reward to someone else before the challenge; not penalized for sitting out', 1, 'Pre-Merge Challenges', false, 6, true),

-- ============================================
-- PRE-MERGE TRIBAL COUNCIL
-- ============================================
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'PRE_NO_TRIBAL', 'Avoid Tribal Council (Pre-Merge)', 'Your player doesn''t go to tribal council', 5, 'Pre-Merge Tribal', false, 10, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'PRE_ATTEND_TRIBAL', 'Attend Tribal Council (Pre-Merge)', 'Your player goes to tribal council', -2, 'Pre-Merge Tribal', true, 11, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'PRE_CANNOT_VOTE', 'Cannot Vote at Tribal (Pre-Merge)', 'Your player goes to tribal council but cannot vote (lost vote or stolen; no penalty for Shot in the Dark)', -1, 'Pre-Merge Tribal', true, 12, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'PRE_SWING_VOTE', 'Swing Vote (Pre-Merge)', 'Your player is the swing vote of the episode (clearly stated in confessional; individual, not a team)', 2, 'Pre-Merge Tribal', false, 13, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'PRE_SURVIVE_TRIBAL', 'Survive Tribal (Pre-Merge)', 'Your player goes to tribal council but does not get snuffed', 5, 'Pre-Merge Tribal', false, 14, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'PRE_VOTE_RECEIVED_COUNT', 'Vote Received Counts (Pre-Merge)', 'Each vote your player receives to vote them out that counts', -1, 'Pre-Merge Tribal', true, 15, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'PRE_VOTE_RECEIVED_NO_COUNT', 'Vote Received Doesn''t Count (Pre-Merge)', 'Each vote your player receives but does not count (eg player is now immune after votes cast)', 1, 'Pre-Merge Tribal', false, 16, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'PRE_SNUFFED', 'Torch Snuffed (Pre-Merge)', 'Your player is snuffed at tribal council', -5, 'Pre-Merge Tribal', true, 17, true),

-- ============================================
-- POST-MERGE REWARD AND INDIVIDUAL IMMUNITY CHALLENGES
-- ============================================
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_IND_REWARD_WIN', 'Win Individual Reward', 'Your player wins an individual reward challenge', 3, 'Post-Merge Challenges', false, 20, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_TEAM_REWARD_WIN', 'Win Team Reward (Post-Merge)', 'Your player participates in a team reward challenge and wins', 1, 'Post-Merge Challenges', false, 21, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_MULTI_ROUND_ADVANCE', 'Advance in Multi-Round Challenge', 'Each round your player advances in a multi-round immunity or reward challenge', 1, 'Post-Merge Challenges', false, 22, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_CHOSEN_FOR_REWARD', 'Chosen for Reward', 'Your player gets chosen to go on a reward or has a reward given to them', 1, 'Post-Merge Challenges', false, 23, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_GIVE_REWARD', 'Give Reward to Someone', 'Your player gives their reward to someone else', 2, 'Post-Merge Challenges', false, 24, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_GIVE_UP_REWARD', 'Give Up Reward Chance (Post-Merge)', 'Your player gives up their chance for reward to someone else before the challenge; not penalized for sitting out', 1, 'Post-Merge Challenges', false, 25, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_AUCTION_MOST_MONEY', 'Most Money at Auction', 'Your player has the most money going into the Survivor auction', 1, 'Post-Merge Challenges', false, 26, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_AUCTION_LEAST_MONEY', 'Least Money at Auction', 'Your player has the least money going into the Survivor auction', -1, 'Post-Merge Challenges', true, 27, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_AUCTION_SHARE_FOOD', 'Share Food at Auction', 'Your player shares food, voluntarily or forced by rules, with others at auction', 1, 'Post-Merge Challenges', false, 28, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_AUCTION_UNSAVORY', 'Unsavory Auction Item', 'Your player spends money on an unsavory item (by Western standards) at auction', -1, 'Post-Merge Challenges', true, 29, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_IND_IMMUNITY_WIN', 'Win Individual Immunity', 'Your player wins individual immunity (includes Final Four fire-making challenge)', 7, 'Post-Merge Challenges', false, 30, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_COMBINED_WIN', 'Win Combined Reward/Immunity', 'Your player wins a combined reward/individual immunity challenge (do not get more points since one challenge)', 7, 'Post-Merge Challenges', false, 31, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_FIRST_ELIMINATED', 'First Eliminated in Challenge', 'Your player is the first individual eliminated in an individual reward or immunity challenge', -1, 'Post-Merge Challenges', true, 32, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_FIRST_ROUND_ELIM', 'Eliminated First Round Multi-Round', 'Your player is eliminated in the first round of a multi-round individual reward or immunity challenge', -1, 'Post-Merge Challenges', true, 33, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_SIT_OUT', 'Sit Out Challenge (Post-Merge)', 'Your player sits out of a reward or immunity challenge', -1, 'Post-Merge Challenges', true, 34, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_QUIT_FOR_FOOD', 'Quit Challenge for Food', 'Your player quits an individual immunity challenge in exchange for an immediate reward (like food)', -2, 'Post-Merge Challenges', true, 35, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_CONVINCE_QUIT', 'Convince Someone to Quit Challenge', 'Your player convinces another player to quit an individual reward or immunity challenge', 3, 'Post-Merge Challenges', false, 36, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_CHOOSE_SELF_FIRE', 'Choose Self for Fire-Making', 'Your player chooses oneself for the Final Four fire-making challenge', 4, 'Post-Merge Challenges', false, 37, true),

-- ============================================
-- POST-MERGE AND MERGE-ATORY TRIBAL COUNCIL
-- ============================================
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_NO_TRIBAL', 'Avoid Tribal Council (Post-Merge)', 'Your player does not go to tribal council', 5, 'Post-Merge Tribal', false, 40, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_SURVIVE_TRIBAL', 'Survive Tribal (Post-Merge)', 'Your player goes to tribal council but doesn''t get snuffed', 5, 'Post-Merge Tribal', false, 41, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_CANNOT_VOTE', 'Cannot Vote at Tribal (Post-Merge)', 'Your player goes to tribal council but cannot vote (lost vote or stolen; no penalty for Shot in the Dark)', -1, 'Post-Merge Tribal', true, 42, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_SWING_VOTE', 'Swing Vote (Post-Merge)', 'Your player is the swing vote of the episode (clearly stated in confessional; individual, not a team)', 2, 'Post-Merge Tribal', false, 43, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_VOTE_RECEIVED_COUNT', 'Vote Received Counts (Post-Merge)', 'Each vote your player receives to vote them out that counts', -1, 'Post-Merge Tribal', true, 44, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_VOTE_RECEIVED_NO_COUNT', 'Vote Received Doesn''t Count (Post-Merge)', 'Each vote your player receives but does not count (eg player is now immune after votes cast)', 1, 'Post-Merge Tribal', false, 45, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POST_SNUFFED', 'Torch Snuffed (Post-Merge)', 'Your player is snuffed at tribal council', -5, 'Post-Merge Tribal', true, 46, true),

-- ============================================
-- ADVANTAGES SCORING
-- ============================================
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_JOURNEY', 'Go on Journey', 'Your player goes on a journey', 1, 'Advantages', false, 50, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_JOURNEY_RISK_WIN', 'Journey Risk Wins Advantage', 'Your player is on a journey, does not play it safe (if choice), and wins the advantage', 3, 'Advantages', false, 51, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_JOURNEY_FORCED_WIN', 'Journey Forced Play Wins', 'Your player is on a journey, must play (no choice), and wins the advantage', 2, 'Advantages', false, 52, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_JOURNEY_RISK_DISADVANTAGE', 'Journey Risk Gets Disadvantage', 'Your player is on a journey, does not play it safe (if choice), and incurs a disadvantage', 1, 'Advantages', false, 53, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_JOURNEY_FORCED_DISADVANTAGE', 'Journey Forced Gets Disadvantage', 'Your player is on a journey, must play (no choice), and incurs a disadvantage', -1, 'Advantages', true, 54, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_JOURNEY_SAFE', 'Journey Plays Safe', 'Your player is on a journey, plays it safe (if choice), and does not get advantage or disadvantage', -1, 'Advantages', true, 55, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_MISS_PLAIN_SIGHT', 'Miss Advantage in Plain Sight', 'Your player does not locate a hidden immunity idol or advantage in plain sight', -1, 'Advantages', true, 56, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_FIND_OUTSIDE_JOURNEY', 'Find Advantage Outside Journey', 'Your player obtains an advantage or clue outside of a journey (+3 only when viewers learn of it)', 3, 'Advantages', false, 57, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_ACTIVATE', 'Activate Advantage', 'Your player activates an advantage by completing prerequisites (eg Beware advantage)', 1, 'Advantages', false, 58, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_ACTIVATE_FAIL', 'Fail to Activate Advantage', 'Your player attempts to activate a real advantage but fails', -1, 'Advantages', true, 59, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_NOT_FOUND_END_EP', 'Clue Not Found by Episode End', 'Your player has a clue to advantage not found by episode end, or inactive advantage not activated', -1, 'Advantages', true, 60, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_FIND_PLAY_SAFE', 'Find Advantage but Play Safe', 'Your player finds a hidden advantage but plays it safe and puts it back', -1, 'Advantages', true, 61, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_UPGRADE_TO_ADVANTAGE', 'Advantage Upgraded', 'Your advantage is upgraded to another advantage', 1, 'Advantages', false, 62, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_UPGRADE_TO_IDOL', 'Advantage Upgraded to Idol', 'Your advantage is upgraded to an immunity idol', 2, 'Advantages', false, 63, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_USE_SUCCESS_SELF', 'Use Advantage Successfully (Self)', 'Your player uses an advantage successfully for themselves', 5, 'Advantages', false, 64, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_USE_SUCCESS_OTHER', 'Use Advantage Successfully (Other)', 'Your player uses an advantage successfully for another player', 3, 'Advantages', false, 65, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_USE_UNSUCCESS', 'Use Advantage Unsuccessfully', 'Your player uses a real or fake advantage unsuccessfully for themselves or another player', -3, 'Advantages', true, 66, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_USED_AGAINST', 'Advantage Used Against You', 'A player uses an advantage against your player (eg steal vote, block vote, disadvantage in challenge)', -2, 'Advantages', true, 67, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_GIVE', 'Give Advantage to Another', 'Your player gives their advantage to another player', 1, 'Advantages', false, 68, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_RECEIVE', 'Receive Advantage from Another', 'Your player receives an advantage from another player', 1, 'Advantages', false, 69, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_RECEIVE_BACK', 'Receive Back Given Advantage', 'Your player receives back an advantage previously given to another player', 1, 'Advantages', false, 70, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_GIVE_BACK', 'Give Back Received Advantage', 'Your player gives back an advantage previously given to another player', 1, 'Advantages', false, 71, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_GAVE_NOT_RETURNED', 'Gave Advantage Not Returned', 'Your player gave an advantage to another player and does not receive it back', -1, 'Advantages', true, 72, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_GIVEN_KEPT', 'Given Advantage and Kept', 'Your player was given an advantage and does not give it back', 1, 'Advantages', false, 73, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_MAKE_FAKE', 'Make/Plant Fake Advantage', 'Your player makes and/or plants a fake advantage (only episode viewers learn)', 3, 'Advantages', false, 74, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_FAKE_FOUND', 'Fake Advantage Found', 'Your player''s fake advantage is found', 1, 'Advantages', false, 75, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_FIND_FAKE_BELIEVE', 'Find Fake Advantage and Believe', 'Your player finds a fake advantage and believes it is real', -1, 'Advantages', true, 76, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_FAKE_USED', 'Fake Advantage Used', 'Your player''s fake advantage is used as if it is real (only episode fake is used)', 1, 'Advantages', false, 77, true),

-- ============================================
-- HIDDEN IMMUNITY IDOLS SCORING
-- ============================================
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'IDOL_FIND', 'Find Hidden Immunity Idol', 'Your player finds a hidden immunity idol (+7 only when viewers learn of it)', 7, 'Hidden Immunity Idols', false, 80, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'IDOL_ACTIVATE', 'Activate Idol from Inactive', 'Your player activates a hidden immunity idol from an inactive idol by completing prerequisites', 1, 'Hidden Immunity Idols', false, 81, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'IDOL_CLUE_NOT_FOUND', 'Idol Clue Not Found by Episode End', 'Your player has a clue to idol not found by episode end, or inactive idol not activated', -1, 'Hidden Immunity Idols', true, 82, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'IDOL_ACTIVATE_FAIL', 'Fail to Activate Idol', 'Your player attempts to activate a real hidden immunity idol but fails', -1, 'Hidden Immunity Idols', true, 83, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'IDOL_FIND_PLAY_SAFE', 'Find Idol but Play Safe', 'Your player finds a hidden immunity idol but plays it safe and puts it back', -1, 'Hidden Immunity Idols', true, 84, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'IDOL_PLAY_SUCCESS_SELF', 'Play Idol Successfully (Self)', 'Your player plays a hidden immunity idol successfully for themselves', 3, 'Hidden Immunity Idols', false, 85, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'IDOL_PLAY_SUCCESS_OTHER', 'Play Idol Successfully (Other)', 'Your player plays a hidden immunity idol successfully for another player', 5, 'Hidden Immunity Idols', false, 86, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'IDOL_PLAY_UNSUCCESS', 'Play Idol Unsuccessfully', 'Your player uses a real or fake idol unsuccessfully for themselves or another player', -3, 'Hidden Immunity Idols', true, 87, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'IDOL_GIVE', 'Give Idol to Another', 'Your player gives their hidden immunity idol to another player', 1, 'Hidden Immunity Idols', false, 88, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'IDOL_RECEIVE', 'Receive Idol from Another', 'Your player receives a hidden immunity idol from another player', 1, 'Hidden Immunity Idols', false, 89, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'IDOL_RECEIVE_BACK', 'Receive Back Given Idol', 'Your player receives back an idol previously given to another player', 1, 'Hidden Immunity Idols', false, 90, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'IDOL_GIVE_BACK', 'Give Back Received Idol', 'Your player gives back an idol previously given to another player', 1, 'Hidden Immunity Idols', false, 91, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'IDOL_GAVE_NOT_RETURNED', 'Gave Idol Not Returned', 'Your player gave an idol to another player and does not receive it back', -1, 'Hidden Immunity Idols', true, 92, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'IDOL_GIVEN_KEPT', 'Given Idol and Kept', 'Your player was given an idol and does not give it back', 1, 'Hidden Immunity Idols', false, 93, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'IDOL_MAKE_FAKE', 'Make/Plant Fake Idol', 'Your player makes and/or plants a fake hidden immunity idol (only episode viewers learn)', 3, 'Hidden Immunity Idols', false, 94, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'IDOL_FAKE_FOUND', 'Fake Idol Found', 'Your player''s fake hidden immunity idol is found', 1, 'Hidden Immunity Idols', false, 95, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'IDOL_FIND_FAKE_BELIEVE', 'Find Fake Idol and Believe', 'Your player finds a fake idol and believes it is real (Its a f***ing stick! incident)', -1, 'Hidden Immunity Idols', true, 96, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'IDOL_FAKE_USED', 'Fake Idol Used', 'Your player''s fake idol is used as if it is real (only episode fake is used)', 1, 'Hidden Immunity Idols', false, 97, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'SHOT_DARK_SUCCESS', 'Shot in the Dark Successful', 'Your player uses their Shot in the Dark successfully', 5, 'Hidden Immunity Idols', false, 98, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'SHOT_DARK_FAIL', 'Shot in the Dark Unsuccessful', 'Your player uses their Shot in the Dark unsuccessfully (rewarded for taking risk)', 1, 'Hidden Immunity Idols', false, 99, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'IDOL_SNUFFED_WITH', 'Snuffed with Idol', 'Your player has a hidden immunity idol, doesn''t play it, and gets snuffed, quits, or evacuated', -3, 'Hidden Immunity Idols', true, 100, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ADV_SNUFFED_WITH', 'Snuffed with Advantage', 'Your player has an advantage, doesn''t play it, and gets snuffed, quits, or evacuated', -3, 'Hidden Immunity Idols', true, 101, true),

-- ============================================
-- RANDOM SCORING
-- ============================================
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'RAND_WARDROBE_MALFUNCTION', 'Wardrobe Malfunction', 'Wardrobe malfunction (more than blurring of a crack or through-the-pants)', 1, 'Random', false, 110, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'RAND_BACKGROUND_STORY', 'Background Story Told', 'Your player''s background story is told (eg flashback to pictures or videos)', 1, 'Random', false, 111, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'RAND_ROMANCE', 'Genuine Romance', 'A genuine romance involving your player (more than snuggling; only episode viewers learn)', 2, 'Random', false, 112, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'RAND_CRY_NEGATIVE', 'Crying (Negative Reasons)', 'Crying/brink of tears for negative reasons (upset, bullied)', -1, 'Random', true, 113, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'RAND_CRY_POSITIVE', 'Crying (Positive Reasons)', 'Crying/brink of tears for positive reasons (happy, proud, excited)', 1, 'Random', false, 114, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'RAND_CONFESSIONAL', 'Shown in Confessional', 'Your player is shown in a confessional', 1, 'Random', false, 115, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'RAND_SECRET_EAT', 'Secretly Eat Food', 'Your player secretly eats food and doesn''t share with the entire tribe', 2, 'Random', false, 116, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'RAND_MEDICAL_EVAL', 'Medical Evaluation', 'Your player gets medical evaluation but is not forced to leave from a medical evacuation', -1, 'Random', true, 117, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'RAND_MEDICAL_EVAC', 'Medical Evacuation', 'Your player is forced to leave from a medical evacuation', -7, 'Random', true, 118, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'RAND_QUIT', 'Quit the Game', 'Your player quits (leaves before going to tribal - different from saying vote me out)', -10, 'Random', true, 119, true),

-- ============================================
-- FINAL THREE
-- ============================================
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'FINAL_MAKE_FTC', 'Make Final Three', 'Your player makes it to the final three (or two if the season goes that way)', 5, 'Final Three', false, 120, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'FINAL_CHOSEN_FOR_FTC', 'Chosen for Final Three', 'You are chosen by another castaway to be in the final three', 2, 'Final Three', false, 121, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'FINAL_JURY_VOTE', 'Receive Jury Vote', 'Each vote your player receives in the final vote', 2, 'Final Three', false, 122, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'FINAL_WIN', 'Win the Season', 'Your player wins the season', 10, 'Final Three', false, 123, true);

SELECT
  'Season 50 seeded successfully!' AS status,
  (SELECT COUNT(*) FROM seasons WHERE number = 50) AS seasons,
  (SELECT COUNT(*) FROM castaways WHERE season_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890') AS castaways,
  (SELECT COUNT(*) FROM episodes WHERE season_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890') AS episodes,
  (SELECT COUNT(*) FROM scoring_rules WHERE season_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890') AS scoring_rules;
