-- ==============================================
-- MANUAL CLOCK SESSION EDITS
-- ==============================================
-- Track admin force clock-outs / time edits for audit.
-- ==============================================

ALTER TABLE clock_sessions
  ADD COLUMN IF NOT EXISTS is_manual_edit boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_notes text;
