-- ==============================================
-- EMPLOYEE CLOCK-IN / CLOCK-OUT SYSTEM
-- ==============================================
-- PIN fields on employees + clock_events + clock_sessions
-- Anon-friendly RLS for kiosk writes via service role APIs
-- ==============================================

-- Add 4-digit PIN to employees table
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS clock_pin char(4),
  ADD COLUMN IF NOT EXISTS pin_hash text; -- store bcrypt hash of PIN, never plain text

-- Clock events table
CREATE TABLE IF NOT EXISTS clock_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('clock_in', 'clock_out')),
  clocked_at timestamptz NOT NULL DEFAULT now(),
  shift_date date NOT NULL DEFAULT CURRENT_DATE, -- the working date this belongs to
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Clock sessions: pairs clock_in + clock_out events into sessions
CREATE TABLE IF NOT EXISTS clock_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  clock_in_id uuid REFERENCES clock_events(id),
  clock_out_id uuid REFERENCES clock_events(id),
  clocked_in_at timestamptz NOT NULL,
  clocked_out_at timestamptz,
  shift_date date NOT NULL,
  duration_minutes int, -- calculated on clock_out: (clocked_out_at - clocked_in_at) in minutes
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clock_events_employee_id ON clock_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_clock_events_shift_date ON clock_events(shift_date);
CREATE INDEX IF NOT EXISTS idx_clock_sessions_employee_id ON clock_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_clock_sessions_shift_date ON clock_sessions(shift_date);
CREATE INDEX IF NOT EXISTS idx_clock_sessions_open ON clock_sessions(employee_id) WHERE clocked_out_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_clock_pin ON employees(clock_pin) WHERE clock_pin IS NOT NULL;

-- updated_at trigger on clock_sessions
CREATE OR REPLACE FUNCTION update_clock_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_clock_sessions_updated_at ON clock_sessions;
CREATE TRIGGER update_clock_sessions_updated_at
  BEFORE UPDATE ON clock_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_clock_sessions_updated_at();

-- Enable RLS
ALTER TABLE clock_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE clock_sessions ENABLE ROW LEVEL SECURITY;

-- Authenticated full access
DROP POLICY IF EXISTS "Authenticated users full access on clock_events" ON clock_events;
CREATE POLICY "Authenticated users full access on clock_events" ON clock_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users full access on clock_sessions" ON clock_sessions;
CREATE POLICY "Authenticated users full access on clock_sessions" ON clock_sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anon: clock_events — INSERT + SELECT (kiosk)
DROP POLICY IF EXISTS "Anon insert clock_events" ON clock_events;
CREATE POLICY "Anon insert clock_events" ON clock_events
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon select clock_events" ON clock_events;
CREATE POLICY "Anon select clock_events" ON clock_events
  FOR SELECT TO anon USING (true);

-- Anon: clock_sessions — INSERT + UPDATE + SELECT (kiosk)
DROP POLICY IF EXISTS "Anon insert clock_sessions" ON clock_sessions;
CREATE POLICY "Anon insert clock_sessions" ON clock_sessions
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon update clock_sessions" ON clock_sessions;
CREATE POLICY "Anon update clock_sessions" ON clock_sessions
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon select clock_sessions" ON clock_sessions;
CREATE POLICY "Anon select clock_sessions" ON clock_sessions
  FOR SELECT TO anon USING (true);

-- Anon SELECT on employees for PIN verification metadata
-- (pin_hash must never be returned to the client — APIs strip it;
--  column privilege revoke below hardens direct PostgREST access)
DROP POLICY IF EXISTS "Anon select employees for clocking" ON employees;
CREATE POLICY "Anon select employees for clocking" ON employees
  FOR SELECT TO anon USING (true);

-- Harden: prevent anon/authenticated from reading pin_hash via PostgREST
REVOKE SELECT (pin_hash) ON employees FROM anon;
REVOKE SELECT (pin_hash) ON employees FROM authenticated;
-- Service role bypasses RLS and column privileges for server-side bcrypt compare
