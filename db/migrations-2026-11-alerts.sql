-- Job alert settings (daily/weekly/monthly, categories, city + radius, minimum match).
-- Safe to run more than once. Run in Supabase → SQL Editor BEFORE the new code goes live.
-- Alert settings themselves live in users.preferences.alerts (no new table);
-- this only adds the application deadline shown in alert emails and on jobs.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS application_deadline timestamptz;
