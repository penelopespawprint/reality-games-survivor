ALTER TABLE users ADD COLUMN IF NOT EXISTS season_50_winner_prediction UUID REFERENCES castaways(id);
