-- ==============================================
-- EMPLOYEE PROFILE PHOTO
-- ==============================================
-- photo_url stores a public Supabase storage URL.
-- Ensure the 'employee-photos' storage bucket is created as PUBLIC in
-- Supabase dashboard (Settings → Storage → New bucket → name:
-- employee-photos → Public: true).
-- ==============================================

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS photo_url text;
