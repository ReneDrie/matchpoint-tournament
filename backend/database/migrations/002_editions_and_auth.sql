CREATE TABLE IF NOT EXISTS tournaments (
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
  final_round_starts_at TINYINT UNSIGNED NOT NULL DEFAULT 3,
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
  CONSTRAINT tournaments_capacity_valid CHECK (capacity IN (32,64,128,256))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO tournaments (id, name, slug, status, starts_at, registration_deadline_at, venue_name, venue_address, capacity, registration_price_cents, daily_summary_email)
VALUES (1, 'Matchpoint Tournament', 'matchpoint-tournament-2027', 'registration', '2027-06-26 11:00:00', '2027-06-26 11:00:00', 'TVA Arkel', 'Hoefpad 5, 4241 DT Arkel', 256, 1250, 'info@matchpointtournament.nl');

ALTER TABLE users MODIFY role ENUM('administrator','host') NOT NULL DEFAULT 'host';

CREATE TABLE IF NOT EXISTS user_sessions (
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

CREATE TABLE IF NOT EXISTS staff_invitations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invited_by BIGINT UNSIGNED NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL,
  role ENUM('administrator','host') NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  accepted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT invitation_user_fk FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS player_access_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  player_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  purpose ENUM('manage','verify_email','payment_retry') NOT NULL DEFAULT 'manage',
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT access_player_fk FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE players ADD COLUMN tournament_id BIGINT UNSIGNED NOT NULL DEFAULT 1 AFTER id;
ALTER TABLE players ADD COLUMN player_number SMALLINT UNSIGNED NULL AFTER tournament_id;
ALTER TABLE players ADD COLUMN pending_email VARCHAR(190) NULL AFTER email;
ALTER TABLE players ADD COLUMN date_of_birth DATE NOT NULL DEFAULT '1900-01-01' AFTER phone;
ALTER TABLE players ADD COLUMN age_verified_at DATETIME NULL AFTER date_of_birth;
ALTER TABLE players ADD COLUMN singles_rating VARCHAR(20) NULL AFTER rating;
ALTER TABLE players ADD COLUMN doubles_rating VARCHAR(20) NULL AFTER singles_rating;
ALTER TABLE players ADD COLUMN entrance_song_query VARCHAR(255) NOT NULL DEFAULT '' AFTER doubles_rating;
ALTER TABLE players ADD COLUMN payment_reservation_expires_at DATETIME NULL AFTER registration_status;
ALTER TABLE players ADD COLUMN privacy_version VARCHAR(40) NOT NULL DEFAULT 'draft-1' AFTER checked_in_at;
ALTER TABLE players ADD COLUMN privacy_accepted_at DATETIME NULL AFTER privacy_version;
ALTER TABLE players ADD COLUMN terms_version VARCHAR(40) NOT NULL DEFAULT 'draft-1' AFTER privacy_accepted_at;
ALTER TABLE players ADD COLUMN terms_accepted_at DATETIME NULL AFTER terms_version;
ALTER TABLE players ADD COLUMN anonymized_at DATETIME NULL AFTER terms_accepted_at;
ALTER TABLE players ADD INDEX players_tournament_status_idx (tournament_id, registration_status);

CREATE TABLE IF NOT EXISTS waitlist_entries (
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
  UNIQUE KEY waitlist_email_unique (tournament_id, email),
  UNIQUE KEY waitlist_position_unique (tournament_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE payments ADD COLUMN refunded_at DATETIME NULL AFTER paid_at;

CREATE TABLE IF NOT EXISTS sponsor_tiers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tournament_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(80) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  UNIQUE KEY tiers_name_unique (tournament_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO sponsor_tiers (tournament_id, name, sort_order) VALUES (1, 'Hoofdsponsor', 1), (1, 'Subsponsor', 2);

ALTER TABLE sponsors ADD COLUMN tournament_id BIGINT UNSIGNED NOT NULL DEFAULT 1 AFTER id;
ALTER TABLE sponsors ADD COLUMN tier_id BIGINT UNSIGNED NULL AFTER tournament_id;
ALTER TABLE sponsors ADD COLUMN show_on_public_pages BOOLEAN NOT NULL DEFAULT TRUE AFTER is_active;

ALTER TABLE courts ADD COLUMN tournament_id BIGINT UNSIGNED NOT NULL DEFAULT 1 AFTER id;
INSERT IGNORE INTO courts (tournament_id, name, sort_order) VALUES (1, 'Baan 1', 1), (1, 'Baan 2', 2);

ALTER TABLE matches ADD COLUMN tournament_id BIGINT UNSIGNED NOT NULL DEFAULT 1 AFTER id;
ALTER TABLE matches ADD COLUMN player_one_is_bye BOOLEAN NOT NULL DEFAULT FALSE AFTER player_two_id;
ALTER TABLE matches ADD COLUMN player_two_is_bye BOOLEAN NOT NULL DEFAULT FALSE AFTER player_one_is_bye;
ALTER TABLE matches MODIFY duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 3;

CREATE TABLE IF NOT EXISTS schedule_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tournament_id BIGINT UNSIGNED NOT NULL,
  court_id BIGINT UNSIGNED NULL,
  item_type ENUM('break','ceremony','maintenance','custom') NOT NULL DEFAULT 'custom',
  title VARCHAR(150) NOT NULL,
  starts_at DATETIME NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 5,
  is_tournament_wide BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE presentation_slides ADD COLUMN tournament_id BIGINT UNSIGNED NOT NULL DEFAULT 1 AFTER id;
ALTER TABLE presentation_slides ADD COLUMN image_path VARCHAR(500) NULL AFTER content_json;
ALTER TABLE presentation_slides MODIFY duration_seconds SMALLINT UNSIGNED NOT NULL DEFAULT 10;

CREATE TABLE IF NOT EXISTS email_messages (
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
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limits (
  rate_key CHAR(64) PRIMARY KEY,
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  window_started_at DATETIME NOT NULL,
  blocked_until DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE audit_log ADD COLUMN tournament_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE audit_log ADD COLUMN ip_address VARCHAR(45) NULL AFTER payload_json;
