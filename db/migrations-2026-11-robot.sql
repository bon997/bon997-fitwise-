-- Job robot (daily automatic imports). Safe to run more than once.
-- Run in Supabase → SQL Editor BEFORE merging the robot. If asked about RLS, choose "Run and enable RLS".
-- ── Daily automatic job imports ─────────────────────────────────────────
-- Searches the admin saves once; a nightly cron (vercel.json) runs them.
CREATE TABLE IF NOT EXISTS import_searches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source       text NOT NULL CHECK (source IN ('jobtech', 'serpapi', 'rapidapi')),
  query        text NOT NULL CHECK (length(query) BETWEEN 2 AND 200),
  location     text CHECK (length(location) <= 100),
  pages        smallint NOT NULL DEFAULT 1 CHECK (pages BETWEEN 1 AND 5),  -- about 10 jobs per page
  enabled      boolean NOT NULL DEFAULT true,
  last_run_at  timestamptz,
  last_result  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS import_searches_unique
  ON import_searches (source, lower(query), lower(coalesce(location, '')));
-- Fitwise reads its tables as their owner; this only shuts Supabase's public API out.
ALTER TABLE import_searches ENABLE ROW LEVEL SECURITY;
