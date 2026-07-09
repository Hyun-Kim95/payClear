CREATE TABLE IF NOT EXISTS oauth_exchange_codes (
  code TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_oauth_exchange_expires ON oauth_exchange_codes(expires_at);
