/*
# Create item_master table

1. Purpose
   Store imported Item Master data mapping Item Names to Item Codes.
   When a user imports an Item Master Excel file, each row maps an item name (column B)
   to an item code (column G). The Calculate screen uses this to display "Item Code | Produced Item Name"
   in the dropdown and show the item code in results and exports.

2. New Tables
   - `item_master` — one row per item name / code mapping.
     - id (uuid PK)
     - item_name (text) — the item name (column B from Excel)
     - item_code (text) — the item code (column G from Excel)
     - uploaded_by (text) — user who imported
     - uploaded_at (timestptz)
     - created_at (timestamptz)
   Only the most recent import is "active" — previous rows are cleared on new import (truncate + insert).
   This keeps the mapping simple and current.

3. Security
   - RLS enabled on item_master.
   - Single-tenant no-auth (matches bom_files and audit_log): allow anon + authenticated full CRUD.
   - USING (true) documented as intentional public/shared data for this no-auth app.

4. Notes
   - On each new Item Master import, all existing rows are deleted and replaced with the new data.
   - item_name is the lookup key used to match against produced_item in BOM calculations.
*/

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
