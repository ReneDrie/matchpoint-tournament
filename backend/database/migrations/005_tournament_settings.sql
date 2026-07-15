ALTER TABLE tournaments
  MODIFY final_round_starts_at TINYINT UNSIGNED NOT NULL DEFAULT 6;

UPDATE tournaments
SET final_round_starts_at = 6
WHERE capacity = 256 AND final_round_starts_at = 3;
