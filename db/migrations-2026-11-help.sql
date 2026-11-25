-- Help chat (the "?" assistant on every page): one row per AI answer, for rate limits. Safe to run more than once.
-- who = 'u:<user id>' for signed-in users, 'ip:<sha256 of IP>' for visitors (the IP itself is never stored).
CREATE TABLE IF NOT EXISTS help_usage (
  id          bigserial PRIMARY KEY,
  who         text NOT NULL CHECK (length(who) <= 80),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS help_usage_who ON help_usage (who, created_at);
CREATE INDEX IF NOT EXISTS help_usage_created ON help_usage (created_at);
ALTER TABLE help_usage ENABLE ROW LEVEL SECURITY;
