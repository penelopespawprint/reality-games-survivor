-- ============================================
-- ADD CASTAWAY PHOTO URLS
-- Migration 011: Add profile photos for Season 50 castaways
-- Using DiceBear avatars as placeholders
-- ============================================

-- Update castaways with photo URLs
-- Using DiceBear API for high-quality avatar generation
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Rob%20Mariano&backgroundColor=8B0000&textColor=ffffff&fontSize=40' WHERE name = 'Rob Mariano';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Sandra%20Diaz-Twine&backgroundColor=8B0000&textColor=ffffff&fontSize=40' WHERE name = 'Sandra Diaz-Twine';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Tony%20Vlachos&backgroundColor=8B0000&textColor=ffffff&fontSize=40' WHERE name = 'Tony Vlachos';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Cirie%20Fields&backgroundColor=8B0000&textColor=ffffff&fontSize=40' WHERE name = 'Cirie Fields';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Tyson%20Apostol&backgroundColor=8B0000&textColor=ffffff&fontSize=40' WHERE name = 'Tyson Apostol';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Sarah%20Lacina&backgroundColor=8B0000&textColor=ffffff&fontSize=40' WHERE name = 'Sarah Lacina';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Ben%20Driebergen&backgroundColor=8B0000&textColor=ffffff&fontSize=40' WHERE name = 'Ben Driebergen';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Natalie%20Anderson&backgroundColor=8B0000&textColor=ffffff&fontSize=40' WHERE name = 'Natalie Anderson';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Parvati%20Shallow&backgroundColor=DAA520&textColor=ffffff&fontSize=40' WHERE name = 'Parvati Shallow';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Kim%20Spradlin-Wolfe&backgroundColor=DAA520&textColor=ffffff&fontSize=40' WHERE name = 'Kim Spradlin-Wolfe';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Jeremy%20Collins&backgroundColor=DAA520&textColor=ffffff&fontSize=40' WHERE name = 'Jeremy Collins';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Michele%20Fitzgerald&backgroundColor=DAA520&textColor=ffffff&fontSize=40' WHERE name = 'Michele Fitzgerald';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Wendell%20Holland&backgroundColor=DAA520&textColor=ffffff&fontSize=40' WHERE name = 'Wendell Holland';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Sophie%20Clarke&backgroundColor=DAA520&textColor=ffffff&fontSize=40' WHERE name = 'Sophie Clarke';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Yul%20Kwon&backgroundColor=DAA520&textColor=ffffff&fontSize=40' WHERE name = 'Yul Kwon';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Denise%20Stapley&backgroundColor=DAA520&textColor=ffffff&fontSize=40' WHERE name = 'Denise Stapley';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Ethan%20Zohn&backgroundColor=B22222&textColor=ffffff&fontSize=40' WHERE name = 'Ethan Zohn';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Tina%20Wesson&backgroundColor=B22222&textColor=ffffff&fontSize=40' WHERE name = 'Tina Wesson';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Earl%20Cole&backgroundColor=B22222&textColor=ffffff&fontSize=40' WHERE name = 'Earl Cole';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=JT%20Thomas&backgroundColor=B22222&textColor=ffffff&fontSize=40' WHERE name = 'JT Thomas';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Vecepia%20Towery&backgroundColor=B22222&textColor=ffffff&fontSize=40' WHERE name = 'Vecepia Towery';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Danni%20Boatwright&backgroundColor=B22222&textColor=ffffff&fontSize=40' WHERE name = 'Danni Boatwright';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Adam%20Klein&backgroundColor=B22222&textColor=ffffff&fontSize=40' WHERE name = 'Adam Klein';
UPDATE castaways SET photo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=Nick%20Wilson&backgroundColor=B22222&textColor=ffffff&fontSize=40' WHERE name = 'Nick Wilson';

-- Verify update
SELECT name, photo_url FROM castaways WHERE photo_url IS NOT NULL;
