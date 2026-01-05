-- ============================================
-- Page Headings and Subtext for CMS
-- ============================================
-- This migration seeds site_copy with page headers and subtitles
-- that can be edited through the admin CMS interface.

-- Insert page headings (ON CONFLICT to handle re-runs)
INSERT INTO site_copy (key, page, section, content_type, content, description) VALUES
  -- Leagues page
  ('leagues.header.title', 'leagues', 'header', 'text', 'All Leagues', 'Main title for the leagues/browse page'),
  ('leagues.header.subtitle', 'leagues', 'header', 'text', 'Browse active leagues and join the action', 'Subtitle for the leagues page'),
  
  -- Dashboard page
  ('dashboard.header.title', 'dashboard', 'header', 'text', 'Welcome back', 'Main title for the dashboard'),
  ('dashboard.header.subtitle', 'dashboard', 'header', 'text', 'Your fantasy headquarters', 'Subtitle for the dashboard'),
  
  -- How to Play page
  ('how-to-play.header.title', 'how-to-play', 'header', 'text', 'How to Play', 'Main title for how to play page'),
  ('how-to-play.header.subtitle', 'how-to-play', 'header', 'text', 'Everything you need to know to dominate your league', 'Subtitle for how to play page'),
  
  -- Castaways page
  ('castaways.header.title', 'castaways', 'header', 'text', 'Season 50 Castaways', 'Main title for castaways page'),
  ('castaways.header.subtitle', 'castaways', 'header', 'text', 'Meet the contestants competing for the title of Sole Survivor', 'Subtitle for castaways page'),
  
  -- Results page
  ('results.header.title', 'results', 'header', 'text', 'Episode Results', 'Main title for results page'),
  ('results.header.subtitle', 'results', 'header', 'text', 'See how your picks performed each episode', 'Subtitle for results page'),
  
  -- Leaderboard page
  ('leaderboard.header.title', 'leaderboard', 'header', 'text', 'Global Leaderboard', 'Main title for leaderboard page'),
  ('leaderboard.header.subtitle', 'leaderboard', 'header', 'text', 'See where you rank among all players', 'Subtitle for leaderboard page'),
  
  -- Profile page
  ('profile.header.title', 'profile', 'header', 'text', 'My Profile', 'Main title for profile page'),
  ('profile.header.subtitle', 'profile', 'header', 'text', 'Manage your account and preferences', 'Subtitle for profile page'),
  
  -- Weekly Timeline page
  ('timeline.header.title', 'timeline', 'header', 'text', 'Weekly Timeline', 'Main title for timeline page'),
  ('timeline.header.subtitle', 'timeline', 'header', 'text', 'Key dates and deadlines for each week', 'Subtitle for timeline page'),
  
  -- Scoring Rules page
  ('scoring.header.title', 'scoring', 'header', 'text', 'Scoring Rules', 'Main title for scoring rules page'),
  ('scoring.header.subtitle', 'scoring', 'header', 'text', 'See how castaways earn and lose points each episode', 'Subtitle for scoring rules page'),
  
  -- Create League page
  ('create-league.header.title', 'create-league', 'header', 'text', 'Create a League', 'Main title for create league page'),
  ('create-league.header.subtitle', 'create-league', 'header', 'text', 'Start your own fantasy league and invite friends', 'Subtitle for create league page'),
  
  -- Join League page
  ('join-league.header.title', 'join-league', 'header', 'text', 'Join a League', 'Main title for join league page'),
  ('join-league.header.subtitle', 'join-league', 'header', 'text', 'Enter a league code to join the competition', 'Subtitle for join league page'),
  
  -- Weekly Pick page
  ('weekly-pick.header.title', 'weekly-pick', 'header', 'text', 'Weekly Pick', 'Main title for weekly pick page'),
  ('weekly-pick.header.subtitle', 'weekly-pick', 'header', 'text', 'Choose your castaway for this episode', 'Subtitle for weekly pick page'),
  
  -- My Team page
  ('my-team.header.title', 'my-team', 'header', 'text', 'My Team', 'Main title for my team page'),
  ('my-team.header.subtitle', 'my-team', 'header', 'text', 'Your drafted castaways and their scores', 'Subtitle for my team page'),
  
  -- Draft Rankings page
  ('draft-rankings.header.title', 'draft-rankings', 'header', 'text', 'Draft Rankings', 'Main title for draft rankings page'),
  ('draft-rankings.header.subtitle', 'draft-rankings', 'header', 'text', 'Rank castaways to set your draft preferences', 'Subtitle for draft rankings page'),
  
  -- Contact page
  ('contact.header.title', 'contact', 'header', 'text', 'Contact Us', 'Main title for contact page'),
  ('contact.header.subtitle', 'contact', 'header', 'text', 'Questions? Feedback? We''d love to hear from you', 'Subtitle for contact page'),
  
  -- Draft page
  ('draft.header.title', 'draft', 'header', 'text', 'Live Draft', 'Main title for draft page'),
  ('draft.header.subtitle', 'draft', 'header', 'text', 'Build your team by drafting castaways', 'Subtitle for draft page'),
  
  -- Trivia page
  ('trivia.header.title', 'trivia', 'header', 'text', 'Daily Trivia', 'Main title for trivia page'),
  ('trivia.header.subtitle', 'trivia', 'header', 'text', 'Test your Survivor knowledge and earn bonus points', 'Subtitle for trivia page'),
  
  -- Season page
  ('season.header.title', 'season', 'header', 'text', 'Season 50', 'Main title for season page'),
  ('season.header.subtitle', 'season', 'header', 'text', 'In the Hands of the Fans', 'Subtitle for season page')

ON CONFLICT (key) DO UPDATE SET
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  updated_at = now();
