CREATE TABLE tournaments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  status ENUM('draft','registration','live','completed','archived') NOT NULL DEFAULT 'draft',
  starts_at DATETIME NOT NULL,
  registration_deadline_at DATETIME NOT NULL,
  timezone VARCHAR(80) NOT NULL DEFAULT 'Europe/Amsterdam',
  venue_name VARCHAR(180) NOT NULL,
  venue_address VARCHAR(255) NOT NULL,
  capacity SMALLINT UNSIGNED NOT NULL DEFAULT 256,
  registration_price_cents INT UNSIGNED NOT NULL DEFAULT 1250,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  default_match_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 3,
  final_round_match_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 5,
  final_round_starts_at TINYINT UNSIGNED NOT NULL DEFAULT 6,
  break_every_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  break_duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 5,
  default_slide_seconds SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  upcoming_match_count SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  daily_summary_email VARCHAR(190) NULL,
  daily_summary_time TIME NOT NULL DEFAULT '18:00:00',
  retention_days SMALLINT UNSIGNED NOT NULL DEFAULT 90,
  privacy_version VARCHAR(40) NOT NULL DEFAULT 'draft-1',
  terms_version VARCHAR(40) NOT NULL DEFAULT 'draft-1',
  settings_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT tournaments_capacity_valid CHECK (capacity IN (32,64,128,256)),
  INDEX tournaments_status_idx (status),
  INDEX tournaments_start_idx (starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('administrator','host') NOT NULL DEFAULT 'host',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  csrf_token CHAR(64) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX sessions_expiry_idx (expires_at),
  INDEX sessions_user_idx (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE staff_invitations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invited_by BIGINT UNSIGNED NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL,
  role ENUM('administrator','host') NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  accepted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT invitation_user_fk FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX invitation_email_idx (email),
  INDEX invitation_expiry_idx (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE players (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tournament_id BIGINT UNSIGNED NOT NULL,
  player_number SMALLINT UNSIGNED NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL,
  pending_email VARCHAR(190) NULL,
  phone VARCHAR(40) NOT NULL,
  date_of_birth DATE NOT NULL,
  age_verified_at DATETIME NOT NULL,
  knltb_number VARCHAR(40) NULL,
  singles_rating VARCHAR(20) NULL,
  doubles_rating VARCHAR(20) NULL,
  entrance_song_query VARCHAR(255) NOT NULL,
  entrance_song_url VARCHAR(500) NULL,
  registration_status ENUM('payment_pending','confirmed','cancelled','refunded') NOT NULL DEFAULT 'payment_pending',
  payment_reservation_expires_at DATETIME NULL,
  checked_in_at DATETIME NULL,
  privacy_version VARCHAR(40) NOT NULL,
  privacy_accepted_at DATETIME NOT NULL,
  terms_version VARCHAR(40) NOT NULL,
  terms_accepted_at DATETIME NOT NULL,
  anonymized_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT players_tournament_fk FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  UNIQUE KEY players_number_unique (tournament_id, player_number),
  INDEX players_status_idx (tournament_id, registration_status),
  INDEX players_email_idx (tournament_id, email),
  INDEX players_checkin_idx (tournament_id, checked_in_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE player_access_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  player_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  purpose ENUM('manage','verify_email','payment_retry') NOT NULL DEFAULT 'manage',
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT access_player_fk FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  INDEX access_expiry_idx (expires_at),
  INDEX access_player_idx (player_id, purpose)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE waitlist_entries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tournament_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL,
  position INT UNSIGNED NOT NULL,
  status ENUM('waiting','invited','registered','expired','removed') NOT NULL DEFAULT 'waiting',
  invitation_token_hash CHAR(64) NULL UNIQUE,
  invited_at DATETIME NULL,
  invitation_expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT waitlist_tournament_fk FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  UNIQUE KEY waitlist_email_unique (tournament_id, email),
  UNIQUE KEY waitlist_position_unique (tournament_id, position),
  INDEX waitlist_status_idx (tournament_id, status, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  player_id BIGINT UNSIGNED NOT NULL,
  provider VARCHAR(30) NOT NULL DEFAULT 'mollie',
  provider_payment_id VARCHAR(100) NOT NULL UNIQUE,
  amount_cents INT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  status VARCHAR(30) NOT NULL,
  paid_at DATETIME NULL,
  refunded_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT payments_player_fk FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE RESTRICT,
  INDEX payments_status_idx (status),
  INDEX payments_player_idx (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sponsor_tiers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tournament_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(80) NOT NULL,
  cost_cents INT UNSIGNED NOT NULL DEFAULT 0,
  included_players SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  CONSTRAINT tiers_tournament_fk FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  UNIQUE KEY tiers_name_unique (tournament_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sponsors (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tournament_id BIGINT UNSIGNED NOT NULL,
  tier_id BIGINT UNSIGNED NULL,
  name VARCHAR(150) NOT NULL,
  contact_email VARCHAR(190) NULL,
  contact_phone VARCHAR(40) NULL,
  website_url VARCHAR(500) NULL,
  logo_path VARCHAR(500) NULL,
  player_limit_override SMALLINT UNSIGNED NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_public_pages BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT sponsors_tournament_fk FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  CONSTRAINT sponsors_tier_fk FOREIGN KEY (tier_id) REFERENCES sponsor_tiers(id) ON DELETE SET NULL,
  INDEX sponsors_active_idx (tournament_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE players
  ADD COLUMN sponsor_id BIGINT UNSIGNED NULL AFTER tournament_id,
  ADD CONSTRAINT players_sponsor_fk FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE SET NULL,
  ADD INDEX players_sponsor_idx (tournament_id, sponsor_id);

CREATE TABLE courts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tournament_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  surface VARCHAR(60) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT courts_tournament_fk FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  UNIQUE KEY courts_name_unique (tournament_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE draws (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tournament_id BIGINT UNSIGNED NOT NULL,
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  bracket_size SMALLINT UNSIGNED NOT NULL,
  published_at DATETIME NULL,
  published_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT draws_tournament_fk FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  CONSTRAINT draws_published_by_fk FOREIGN KEY (published_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY draws_tournament_unique (tournament_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE draw_slots (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  draw_id BIGINT UNSIGNED NOT NULL,
  position SMALLINT UNSIGNED NOT NULL,
  player_id BIGINT UNSIGNED NULL,
  is_bye BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT draw_slots_draw_fk FOREIGN KEY (draw_id) REFERENCES draws(id) ON DELETE CASCADE,
  CONSTRAINT draw_slots_player_fk FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL,
  UNIQUE KEY draw_slots_position_unique (draw_id, position),
  UNIQUE KEY draw_slots_player_unique (draw_id, player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE matches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tournament_id BIGINT UNSIGNED NOT NULL,
  round_number TINYINT UNSIGNED NOT NULL,
  bracket_position SMALLINT UNSIGNED NOT NULL,
  player_one_id BIGINT UNSIGNED NULL,
  player_two_id BIGINT UNSIGNED NULL,
  player_one_is_bye BOOLEAN NOT NULL DEFAULT FALSE,
  player_two_is_bye BOOLEAN NOT NULL DEFAULT FALSE,
  winner_id BIGINT UNSIGNED NULL,
  next_match_id BIGINT UNSIGNED NULL,
  next_match_slot ENUM('player_one','player_two') NULL,
  court_id BIGINT UNSIGNED NULL,
  scheduled_at DATETIME NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 3,
  status ENUM('draft','scheduled','ready','complete') NOT NULL DEFAULT 'draft',
  completed_at DATETIME NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY match_bracket_unique (tournament_id, round_number, bracket_position),
  CONSTRAINT match_tournament_fk FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  CONSTRAINT match_p1_fk FOREIGN KEY (player_one_id) REFERENCES players(id) ON DELETE SET NULL,
  CONSTRAINT match_p2_fk FOREIGN KEY (player_two_id) REFERENCES players(id) ON DELETE SET NULL,
  CONSTRAINT match_winner_fk FOREIGN KEY (winner_id) REFERENCES players(id) ON DELETE SET NULL,
  CONSTRAINT match_next_fk FOREIGN KEY (next_match_id) REFERENCES matches(id) ON DELETE SET NULL,
  CONSTRAINT match_court_fk FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE SET NULL,
  CONSTRAINT match_user_fk FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX match_schedule_idx (tournament_id, scheduled_at, court_id),
  INDEX match_status_idx (tournament_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE schedule_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tournament_id BIGINT UNSIGNED NOT NULL,
  court_id BIGINT UNSIGNED NULL,
  item_type ENUM('break','ceremony','maintenance','custom') NOT NULL DEFAULT 'custom',
  title VARCHAR(150) NOT NULL,
  starts_at DATETIME NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 5,
  is_tournament_wide BOOLEAN NOT NULL DEFAULT FALSE,
  is_automatic BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT schedule_tournament_fk FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  CONSTRAINT schedule_court_fk FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE,
  INDEX schedule_time_idx (tournament_id, starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE presentation_slides (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tournament_id BIGINT UNSIGNED NOT NULL,
  type ENUM('custom','image','sponsor','upcoming_matches','round_announcement','featured_round') NOT NULL,
  title VARCHAR(180) NULL,
  content_json JSON NULL,
  image_path VARCHAR(500) NULL,
  sponsor_id BIGINT UNSIGNED NULL,
  duration_seconds SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT slides_tournament_fk FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  CONSTRAINT slide_sponsor_fk FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE SET NULL,
  INDEX slides_active_idx (tournament_id, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE email_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tournament_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NULL,
  message_type ENUM('secure_link','payment_confirmation','waitlist_invitation','daily_summary','broadcast','staff_invitation') NOT NULL,
  recipient_email VARCHAR(190) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  provider_message_id VARCHAR(190) NULL,
  status ENUM('queued','sent','delivered','bounced','failed') NOT NULL DEFAULT 'queued',
  metadata_json JSON NULL,
  sent_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_tournament_fk FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE SET NULL,
  CONSTRAINT email_user_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX email_status_idx (status, created_at),
  INDEX email_recipient_idx (recipient_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tournament_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  payload_json JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT audit_tournament_fk FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE SET NULL,
  CONSTRAINT audit_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX audit_entity_idx (entity_type, entity_id),
  INDEX audit_tournament_idx (tournament_id, created_at),
  INDEX audit_created_idx (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rate_limits (
  rate_key CHAR(64) PRIMARY KEY,
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  window_started_at DATETIME NOT NULL,
  blocked_until DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX rate_limit_cleanup_idx (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tournaments (
  name, slug, status, starts_at, registration_deadline_at, venue_name, venue_address,
  capacity, registration_price_cents, daily_summary_email
) VALUES (
  'Matchpoint Tournament', 'matchpoint-tournament-2027', 'registration',
  '2027-06-26 11:00:00', '2027-06-26 11:00:00',
  'TVA Arkel', 'Hoefpad 5, 4241 DT Arkel', 256, 1250, 'info@matchpointtournament.nl'
);

SET @tournament_id = LAST_INSERT_ID();
INSERT INTO courts (tournament_id, name, sort_order) VALUES
  (@tournament_id, 'Baan 1', 1),
  (@tournament_id, 'Baan 2', 2);
INSERT INTO sponsor_tiers (tournament_id, name, cost_cents, included_players, sort_order) VALUES
  (@tournament_id, 'Hoofdsponsor', 0, 4, 1),
  (@tournament_id, 'Subsponsor', 0, 2, 2);
