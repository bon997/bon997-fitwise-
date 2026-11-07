-- Phase 2 (fit score 40/30/20/10 with education). Safe to run more than once.
-- Run this in Supabase → SQL Editor BEFORE the new code goes live.
ALTER TABLE users ADD COLUMN IF NOT EXISTS education jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS education jsonb;
