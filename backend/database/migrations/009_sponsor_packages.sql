ALTER TABLE sponsor_tiers
  ADD COLUMN cost_cents INT UNSIGNED NOT NULL DEFAULT 0 AFTER name,
  ADD COLUMN included_players SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER cost_cents;

ALTER TABLE sponsors
  ADD COLUMN contact_email VARCHAR(190) NULL AFTER name,
  ADD COLUMN contact_phone VARCHAR(40) NULL AFTER contact_email,
  ADD COLUMN player_limit_override SMALLINT UNSIGNED NULL AFTER logo_path;

UPDATE sponsor_tiers SET included_players = 4 WHERE name = 'Hoofdsponsor';
UPDATE sponsor_tiers SET included_players = 2 WHERE name = 'Subsponsor';
