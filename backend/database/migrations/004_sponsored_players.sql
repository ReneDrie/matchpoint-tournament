ALTER TABLE players
  ADD COLUMN sponsor_id BIGINT UNSIGNED NULL AFTER tournament_id,
  ADD CONSTRAINT players_sponsor_fk FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE SET NULL,
  ADD INDEX players_sponsor_idx (tournament_id, sponsor_id);
