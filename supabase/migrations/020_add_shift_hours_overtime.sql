-- ==============================================
-- SHIFT HOURS + OVERTIME TRACKING
-- ==============================================
-- Session-level shift selection (day/night) with
-- scheduled bounds, regular vs overtime minutes.
-- ==============================================

ALTER TABLE clock_sessions
  ADD COLUMN IF NOT EXISTS shift_type text CHECK (shift_type IN ('day', 'night')),
  ADD COLUMN IF NOT EXISTS scheduled_start time,
  ADD COLUMN IF NOT EXISTS scheduled_end time,
  ADD COLUMN IF NOT EXISTS regular_minutes int,
  ADD COLUMN IF NOT EXISTS overtime_minutes int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_overnight boolean DEFAULT false;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS total_overtime_minutes int DEFAULT 0;
