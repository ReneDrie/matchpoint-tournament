-- The original prototype used a single-tournament identity check and bracket
-- uniqueness rule. Replace those constraints after introducing editions.
ALTER TABLE players DROP CHECK players_identity_required;

ALTER TABLE matches DROP INDEX match_bracket_unique;
ALTER TABLE matches
  ADD UNIQUE KEY match_bracket_unique (tournament_id, round_number, bracket_position);
