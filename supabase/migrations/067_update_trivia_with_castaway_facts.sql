-- ============================================
-- UPDATE TRIVIA QUESTIONS WITH CASTAWAY FUN FACTS
-- Migration 067: Replace trivia questions with Season 50 castaway-based questions
-- Each question is derived from a castaway's fun fact
-- ============================================

-- Clear existing questions
DELETE FROM daily_trivia_questions;

-- Insert 24 trivia questions (one per Season 50 castaway)
INSERT INTO daily_trivia_questions (question_number, question, options, correct_index, fun_fact) VALUES

-- 1. Rob Mariano
(1, 'Which Survivor legend proposed to their future spouse on the finale of All-Stars?',
  ARRAY['Ethan Zohn', 'Rob Mariano', 'JT Thomas', 'Tyson Apostol'],
  1, NULL),

-- 2. Sandra Diaz-Twine
(2, 'Who is the only player to win Survivor twice and is famous for the strategy "As long as it ain''t me"?',
  ARRAY['Parvati Shallow', 'Tony Vlachos', 'Sandra Diaz-Twine', 'Kim Spradlin-Wolfe'],
  2, NULL),

-- 3. Tony Vlachos
(3, 'Which winner is known for building spy shacks and bunkers to eavesdrop on tribemates?',
  ARRAY['Ben Driebergen', 'Tony Vlachos', 'Jeremy Collins', 'Yul Kwon'],
  1, NULL),

-- 4. Cirie Fields
(4, 'Which legendary player started as someone "afraid to get off the couch" and became one of the best to never win?',
  ARRAY['Cirie Fields', 'Denise Stapley', 'Michele Fitzgerald', 'Sophie Clarke'],
  0, NULL),

-- 5. Tyson Apostol
(5, 'Which winner was a professional cyclist who once voted himself out by mistake in Heroes vs Villains?',
  ARRAY['Adam Klein', 'Tyson Apostol', 'Nick Wilson', 'Wendell Holland'],
  1, NULL),

-- 6. Sarah Lacina
(6, 'Which player was the first to win Game Changers by playing "like a criminal instead of a cop"?',
  ARRAY['Sarah Lacina', 'Tony Vlachos', 'Ben Driebergen', 'Jeremy Collins'],
  0, NULL),

-- 7. Ben Driebergen
(7, 'Which Marine veteran found 3 idols in his winning season and won the fire-making challenge to reach Final 3?',
  ARRAY['Tony Vlachos', 'Jeremy Collins', 'Ben Driebergen', 'JT Thomas'],
  2, NULL),

-- 8. Natalie Anderson
(8, 'Which winner''s twin sister Nadiya was voted out first in their original season?',
  ARRAY['Michele Fitzgerald', 'Natalie Anderson', 'Parvati Shallow', 'Kim Spradlin-Wolfe'],
  1, NULL),

-- 9. Parvati Shallow
(9, 'Who pioneered the "Black Widow Brigade" alliance and flirting strategy in Micronesia?',
  ARRAY['Kim Spradlin-Wolfe', 'Sarah Lacina', 'Parvati Shallow', 'Sandra Diaz-Twine'],
  2, NULL),

-- 10. Kim Spradlin-Wolfe
(10, 'Which interior designer is considered to have played the most dominant winning game ever in One World?',
  ARRAY['Sophie Clarke', 'Denise Stapley', 'Michele Fitzgerald', 'Kim Spradlin-Wolfe'],
  3, NULL),

-- 11. Jeremy Collins
(11, 'Which firefighter won Cambodia by successfully playing his "meat shield" strategy?',
  ARRAY['Ben Driebergen', 'Jeremy Collins', 'Tony Vlachos', 'Yul Kwon'],
  1, NULL),

-- 12. Michele Fitzgerald
(12, 'Which winner didn''t receive any votes at final tribal council until the winner reveal?',
  ARRAY['Danni Boatwright', 'Vecepia Towery', 'Sophie Clarke', 'Michele Fitzgerald'],
  3, NULL),

-- 13. Wendell Holland
(13, 'Which furniture designer won Ghost Island in the first ever tie-breaker vote at Final Tribal Council?',
  ARRAY['Adam Klein', 'Nick Wilson', 'Wendell Holland', 'Earl Cole'],
  2, NULL),

-- 14. Sophie Clarke
(14, 'Who beat Coach in South Pacific by calling out his religious hypocrisy at Final Tribal?',
  ARRAY['Kim Spradlin-Wolfe', 'Sophie Clarke', 'Denise Stapley', 'Michele Fitzgerald'],
  1, NULL),

-- 15. Yul Kwon
(15, 'Which tech executive led the famous "Aitu Four" comeback from 4 vs 8 to win Cook Islands?',
  ARRAY['Earl Cole', 'Ethan Zohn', 'Yul Kwon', 'JT Thomas'],
  2, NULL),

-- 16. Denise Stapley
(16, 'Which therapist attended every single tribal council in Philippines and still won?',
  ARRAY['Cirie Fields', 'Denise Stapley', 'Tina Wesson', 'Vecepia Towery'],
  1, NULL),

-- 17. Ethan Zohn
(17, 'Which cancer survivor used their Survivor winnings to start the Grassroot Soccer charity?',
  ARRAY['JT Thomas', 'Adam Klein', 'Ethan Zohn', 'Nick Wilson'],
  2, NULL),

-- 18. Tina Wesson
(18, 'Who was the first female winner of Survivor and later returned with their daughter?',
  ARRAY['Sandra Diaz-Twine', 'Vecepia Towery', 'Danni Boatwright', 'Tina Wesson'],
  3, NULL),

-- 19. Earl Cole
(19, 'Who was the first unanimous winner in Survivor history and had never watched the show before playing?',
  ARRAY['JT Thomas', 'Earl Cole', 'Yul Kwon', 'Kim Spradlin-Wolfe'],
  1, NULL),

-- 20. JT Thomas
(20, 'Which cattle rancher won Tocantins with zero votes against him but is infamous for giving his idol to Russell?',
  ARRAY['Nick Wilson', 'Adam Klein', 'JT Thomas', 'Tyson Apostol'],
  2, NULL),

-- 21. Vecepia Towery
(21, 'Who was the first African American winner of Survivor, known for their under-the-radar game?',
  ARRAY['Earl Cole', 'Vecepia Towery', 'Jeremy Collins', 'Wendell Holland'],
  1, NULL),

-- 22. Danni Boatwright
(22, 'Which winner hid their strategy from producers by speaking in code during Guatemala?',
  ARRAY['Sophie Clarke', 'Kim Spradlin-Wolfe', 'Danni Boatwright', 'Tina Wesson'],
  2, NULL),

-- 23. Adam Klein
(23, 'Which podcaster dedicated their win to their mother who passed away from lung cancer days after filming?',
  ARRAY['Nick Wilson', 'Adam Klein', 'Tyson Apostol', 'Wendell Holland'],
  1, NULL),

-- 24. Nick Wilson
(24, 'Which public defender named all their alliances after famous duos like Mason-Dixon and Rockstars?',
  ARRAY['Adam Klein', 'JT Thomas', 'Wendell Holland', 'Nick Wilson'],
  3, NULL);

-- Verify all questions were inserted
DO $$
DECLARE
  question_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO question_count FROM daily_trivia_questions WHERE question_number IS NOT NULL;
  IF question_count != 24 THEN
    RAISE EXCEPTION 'Expected 24 questions, but found %', question_count;
  END IF;
END $$;

COMMENT ON TABLE daily_trivia_questions IS 'Season 50 castaway trivia - 24 questions based on each castaway''s fun fact';
