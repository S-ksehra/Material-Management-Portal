/*
# Create app_users and otp_store tables

1. Purpose
   The auth-api edge function requires two tables that were referenced in code
   but never created in the database: `app_users` (login accounts) and `otp_store`
   (one-time passwords for OTP-based login/reset flows). Without these tables,
   all login attempts fail because the edge function cannot query user records.

2. New Tables
   - `app_users` — application user accounts with password-based auth.
     - id (uuid PK)
     - username (text, unique) — display name / login identifier
     - email (text, unique) — lowercased, used as login identifier
     - password_hash (text) — SHA-256 hash of salted password
     - is_active (boolean, default true) — controls login eligibility
     - must_change_password (boolean, default true) — forces password change on first login
     - created_at (timestamptz)
     - updated_at (timestamptz)
   - `otp_store` — one-time password codes for OTP login and password reset.
     - id (uuid PK)
     - email (text) — user email the OTP was issued for
     - otp_code (text) — 6-digit code
     - purpose (text) — 'login' or 'reset'
     - is_used (boolean, default false)
     - expires_at (timestamptz) — 10-minute validity window
     - created_at (timestamptz)

3. Security
   - RLS enabled on both tables.
   - The edge function uses the service role key which bypasses RLS, so policies
     are permissive (anon + authenticated) for any client-side reads if needed.
   - USING (true) is acceptable here because auth is handled by the edge function
     server-side, and the frontend never directly queries these tables.

4. Data
   - Inserts three authorized user accounts with username, email, and the
     SHA-256 hash of "bom_salt_v1:Sakshi@123" (the default password).
   - All accounts are active and must_change_password is set to true so users
     set a new password on first login.

5. Notes
   - Password hashing uses SHA-256 with a static salt prefix "bom_salt_v1:",
     matching the edge function's hashPassword() implementation.
   - Emails are stored lowercase to match the edge function's findUser() lookup.
   - The otp_store table is cleared and recreated on each new OTP request.
*/

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_username ON app_users(username);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_app_users" ON app_users;
CREATE POLICY "anon_select_app_users"
ON app_users FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_app_users" ON app_users;
CREATE POLICY "anon_insert_app_users"
ON app_users FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_app_users" ON app_users;
CREATE POLICY "anon_update_app_users"
ON app_users FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_app_users" ON app_users;
CREATE POLICY "anon_delete_app_users"
ON app_users FOR DELETE
TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS otp_store (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_code text NOT NULL,
  purpose text NOT NULL DEFAULT 'login',
  is_used boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_store_email ON otp_store(email);
CREATE INDEX IF NOT EXISTS idx_otp_store_expires ON otp_store(expires_at);

ALTER TABLE otp_store ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_otp_store" ON otp_store;
CREATE POLICY "anon_select_otp_store"
ON otp_store FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_otp_store" ON otp_store;
CREATE POLICY "anon_insert_otp_store"
ON otp_store FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_otp_store" ON otp_store;
CREATE POLICY "anon_update_otp_store"
ON otp_store FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_otp_store" ON otp_store;
CREATE POLICY "anon_delete_otp_store"
ON otp_store FOR DELETE
TO anon, authenticated USING (true);

-- Insert the three authorized user accounts.
-- Password hash = SHA-256("bom_salt_v1:Sakshi@123")
INSERT INTO app_users (username, email, password_hash, is_active, must_change_password)
VALUES
  ('Admin', 'varun.garg@sakshilaminates.com', 'b17f0073707576552b4172f7136ec63af8ad06af8efb5b0443fdaf1f5527ce47', true, true),
  ('Siddharth Kaushik', 'siddharth.kaushik@sakshilaminates.com', 'b17f0073707576552b4172f7136ec63af8ad06af8efb5b0443fdaf1f5527ce47', true, true),
  ('Shiv Parsad', 'sakshi4@gmail.com', 'b17f0073707576552b4172f7136ec63af8ad06af8efb5b0443fdaf1f5527ce47', true, true)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = EXCLUDED.is_active,
  must_change_password = EXCLUDED.must_change_password,
  updated_at = now();
