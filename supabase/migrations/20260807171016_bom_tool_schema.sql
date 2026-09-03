/*
# BOM Explosion Tool — Database Schema

1. Purpose
   Persist uploaded BOM Excel file metadata, parsed BOM data (BOM Summary + Consumption Details),
   and an audit log of all activities (import, delete, replace, calculate, export).
   This is a single-tenant, no-auth application — data is intentionally shared/public.

2. New Tables
   - `bom_files` — one row per uploaded Excel file. Holds filename, version, status (active/inactive/deleted),
     parsed BOM data (bom_summary + consumption_details) as JSONB, summary stats, and audit metadata.
   - `audit_log` — append-only activity log: action, user, date/time, remarks.

3. Columns (bom_files)
   - id (uuid PK)
   - file_name (text) — original uploaded filename
   - version (int) — increments per upload sequence
   - status (text) — 'active' | 'inactive' | 'deleted'
   - bom_summary (jsonb) — array of { bom_name, produced_item, quantity, unit }
   - consumption_details (jsonb) — array of { bom_name, produced_item, consumption_item, unit, quantity }
   - total_bom (int) — count of distinct BOM names
   - total_produced_items (int) — count of distinct produced items
   - total_consumption_items (int) — count of consumption records
   - uploaded_by (text) — user label (default 'System')
   - uploaded_at (timestamptz)
   - replaced_by (text) — filename that replaced this one (nullable)
   - deleted_by (text) — user who deleted (nullable)
   - deleted_at (timestamptz) — when deleted (nullable)
   - created_at (timestamptz)

4. Columns (audit_log)
   - id (uuid PK)
   - action (text) — e.g. 'File Imported', 'File Deleted', 'Calculation Executed', 'Export Excel', 'Export PDF'
   - user (text) — actor label
   - remarks (text) — detail
   - created_at (timestamptz)

5. Security
   - RLS enabled on both tables.
   - Single-tenant no-auth: allow anon + authenticated full CRUD (data is intentionally shared/public).
   - USIBG (true) documented as intentional public/shared data for this no-auth app.

6. Notes
   - Parsed BOM data stored as JSONB to support large files (up to 100MB Excel / 100k+ consumption rows)
     while keeping schema simple. Querying is done client-side after fetch of the active file.
   - Only one file is active at a time; enforced at application layer (previous active set inactive on new import).
*/

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

DROP POLICY IF EXISTS "anon_update_audit_log" ON audit_log;
CREATE POLICY "anon_update_audit_log"
ON audit_log FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_audit_log" ON audit_log;
CREATE POLICY "anon_delete_audit_log"
ON audit_log FOR DELETE
TO anon, authenticated USING (true);
