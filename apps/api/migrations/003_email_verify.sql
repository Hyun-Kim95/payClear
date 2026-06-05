-- email verification tokens (OAuth register-email)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verify_token TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verify_expires_at TIMESTAMPTZ;
