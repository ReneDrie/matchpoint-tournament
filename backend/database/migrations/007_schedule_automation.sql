ALTER TABLE schedule_items
  ADD COLUMN is_automatic BOOLEAN NOT NULL DEFAULT FALSE AFTER is_tournament_wide;
