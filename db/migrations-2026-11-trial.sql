-- Free Pro trial (7 days by default, see TRIAL_DAYS). Safe to run more than once.
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
