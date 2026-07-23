CREATE TABLE IF NOT EXISTS staff_password_resets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT password_resets_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX password_resets_expiry_idx (expires_at),
  INDEX password_resets_user_idx (user_id, used_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE email_messages
  MODIFY message_type ENUM(
    'secure_link',
    'payment_confirmation',
    'waitlist_invitation',
    'daily_summary',
    'broadcast',
    'staff_invitation',
    'staff_password_reset'
  ) NOT NULL;
