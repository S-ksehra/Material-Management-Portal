/*
# Create all application tables with RLS policies and seed users

1. Purpose
   Creates the five database tables the BOM Explosion Tool needs, with
   correct Row Level Security policies for each table's access pattern,
   and seeds three authorized user accounts. This replaces the three
   prior migrations that were never applied to the live database.

2. New Tables

   A. app_users — login accounts (queried ONLY by the auth-api edge function
      via the service role key, which bypasses RLS).
      - id (uuid PK)
      - username (text, unique) — display name
      - email (text, unique) — login identifier
      - password_hash (text) — SHA-256 of "bom_salt_v1:<password>"
      - is_active (boolean, default true)
      - must_change_password (boolean, default true)
      - created_at, updated_at (timestamptz)

   B. otp_store — one-time password codes for OTP login / password reset.
      - id (uuid PK)
      - email (text)
      - otp_code (text)
      - purpose (text) — 'login' or 'reset'
      - is_used (boolean, default false)
      - expires_at (timestamptz) — 10-minute validity
      - created_at (timestamptz)

   C. bom_files — uploaded BOM Excel file data (queried directly from the
      frontend with the anon key).
      - id (uuid PK)
      - file_name, version, status
      - bom_summary, consumption_details (jsonb)
      - total_bom, total_produced_items, total_consumption_items
      - uploaded_by, uploaded_at, replaced_by, deleted_by, deleted_at, created_at

   D. item_master — item name → item code mappings (queried directly from
      the frontend with the anon key).
      - id (uuid PK)
      - item_name (text) — lookup key
      - item_code (text)
      - uploaded_by, uploaded_at, created_at

   E. audit_log — append-only activity log.
      - id (uuid PK)
      - action (text) — e.g. 'File Imported', 'Calculation Executed'
      - "user" (text)
      - remarks (text)
      - created_at (timestamptz)

3. Security — RLS Policies

   app_users & otp_store:
     - RLS enabled. NO policies for anon or authenticated.
     - These tables are ONLY accessed by the auth-api edge function using
       the service role key, which bypasses RLS.
     - Denying anon/authenticated prevents the frontend from reading
       password hashes or OTP codes directly — this is a critical security
       requirement. The prior migration had USING (true) policies here,
       which is a security flaw that this migration corrects.

   bom_files:
     - RLS enabled. Full CRUD for anon + authenticated (USING (true)).
     - The frontend reads/writes bom_files directly with the anon key.
     - USING (true) is intentional: data is shared across all logged-in users
       (single-tenant app with custom auth via edge function).

   item_master:
     - RLS enabled. Full CRUD for anon + authenticated (USING (true)).
     - Same rationale as bom_files.

   audit_log:
     - RLS enabled. SELECT + INSERT for anon + authenticated.
     - UPDATE and DELETE intentionally denied (append-only audit trail).

4. Data
   Seeds three authorized users into app_users:
     1. Admin — varun.garg@sakshilaminates.com
     2. Siddharth Kaushik — siddharth.kaushik@sakshilaminates.com
     3. Shiv Parsad — sakshi4@gmail.com
   All seeded with password hash of "Sakshi@123" and must_change_password = true.

5. Notes
   - Password hashing: SHA-256 with static salt "bom_salt_v1:", matching the
     edge function's hashPassword() implementation.
   - Emails stored lowercase to match edge function lookup.
   - Only one bom_file is active at a time (enforced at application layer).
   - item_master rows are cleared and replaced on each new import.
   - Idempotent: safe to re-run (IF NOT EXISTS on tables, DROP IF EXISTS on policies).
*/

-- ============================================================
-- app_users (service-role-only access — no anon/authenticated policies)
-- ============================================================

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

-- Drop permissive policies from prior migrations so app_users is locked down.
DROP POLICY IF EXISTS "anon_select_app_users" ON app_users;
DROP POLICY IF EXISTS "anon_insert_app_users" ON app_users;
DROP POLICY IF EXISTS "anon_update_app_users" ON app_users;
DROP POLICY IF EXISTS "anon_delete_app_users" ON app_users;

-- ============================================================
-- otp_store (service-role-only access — no anon/authenticated policies)
-- ============================================================

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
DROP POLICY IF EXISTS "anon_insert_otp_store" ON otp_store;
DROP POLICY IF EXISTS "anon_update_otp_store" ON otp_store;
DROP POLICY IF EXISTS "anon_delete_otp_store" ON otp_store;

-- ============================================================
-- bom_files (full CRUD for anon + authenticated — frontend access)
-- ============================================================

CREATE TABLE IF NOT EXISTS bom_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  bom_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  consumption_details jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_bom int NOT NULL DEFAULT 0,
  total_produced_items int NOT NULL DEFAULT 0,
  total_consumption_items int NOT NULL DEFAULT 0,
  uploaded_by text NOT NULL DEFAULT 'System',
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  replaced_by text,
  deleted_by text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bom_files_status ON bom_files(status);

ALTER TABLE bom_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_bom_files" ON bom_files;
CREATE POLICY "anon_select_bom_files"
ON bom_files FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bom_files" ON bom_files;
CREATE POLICY "anon_insert_bom_files"
ON bom_files FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_bom_files" ON bom_files;
CREATE POLICY "anon_update_bom_files"
ON bom_files FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_bom_files" ON bom_files;
CREATE POLICY "anon_delete_bom_files"
ON bom_files FOR DELETE
TO anon, authenticated USING (true);

-- ============================================================
-- item_master (full CRUD for anon + authenticated — frontend access)
-- ============================================================

CREATE TABLE IF NOT EXISTS item_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  item_code text NOT NULL,
  uploaded_by text NOT NULL DEFAULT 'System',
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_item_master_item_name ON item_master(item_name);

ALTER TABLE item_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_item_master" ON item_master;
CREATE POLICY "anon_select_item_master"
ON item_master FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_item_master" ON item_master;
CREATE POLICY "anon_insert_item_master"
ON item_master FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_item_master" ON item_master;
CREATE POLICY "anon_update_item_master"
ON item_master FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_item_master" ON item_master;
CREATE POLICY "anon_delete_item_master"
ON item_master FOR DELETE
TO anon, authenticated USING (true);

-- ============================================================
-- audit_log (SELECT + INSERT only — append-only)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  "user" text NOT NULL DEFAULT 'System',
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_audit_log" ON audit_log;
CREATE POLICY "anon_select_audit_log"
ON audit_log FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_audit_log" ON audit_log;
CREATE POLICY "anon_insert_audit_log"
ON audit_log FOR INSERT
TO anon, authenticated WITH CHECK (true);

-- UPDATE and DELETE intentionally NOT created (append-only audit trail).
DROP POLICY IF EXISTS "anon_update_audit_log" ON audit_log;
DROP POLICY IF EXISTS "anon_delete_audit_log" ON audit_log;

-- ============================================================
-- Seed authorized users
-- Password hash = SHA-256("bom_salt_v1:Sakshi@123")
-- ============================================================

INSERT INTO app_users (username, email, password_hash, is_active, must_change_password)
VALUES
  ('Admin', 'varun.garg@sakshilaminates.com', 'b17f0073707576552b4172f7136ec63af8ad06af8efb5b0443fdaf1f5527ce47', true, true),
  ('Siddharth Kaushik', 'siddharth.kaushik@sakshilaminates.com', 'b17f0073707576552b4172f7136ec63af8ad06af8efb5b0443fdaf1f5527ce47', true, true),
  ('Shiv Parsad', 'sakshi4@gmail.com', 'b17f0073707576552b4172f7136ec63af8ad06af8efb5b0443fdaf1f5527ce47', true, true)
ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username,
  password_hash = EXCLUDED.password_hash,
  is_active = EXCLUDED.is_active,
  must_change_password = EXCLUDED.must_change_password,
  updated_at = now();
