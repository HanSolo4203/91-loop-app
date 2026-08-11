-- ==============================================
-- ADMIN KIOSK PIN
-- ==============================================
-- 4-digit PIN on admin profiles for enabling and
-- exiting device kiosk mode (independent of auth).
-- ==============================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS kiosk_pin char(4),
  ADD COLUMN IF NOT EXISTS kiosk_pin_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_kiosk_pin
  ON profiles(kiosk_pin)
  WHERE kiosk_pin IS NOT NULL;

COMMENT ON COLUMN profiles.kiosk_pin IS '4-digit PIN used to enable/exit clocking kiosk mode';
COMMENT ON COLUMN profiles.kiosk_pin_hash IS 'bcrypt hash of kiosk_pin';
