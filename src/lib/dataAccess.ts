import { supabase } from './supabase';
import type { BomFile, AuditEntry, BomStatus, ItemMasterEntry } from '@/types';

const FILES_TABLE = 'bom_files';
const AUDIT_TABLE = 'audit_log';
const ITEM_MASTER_TABLE = 'item_master';

export async function logAudit(action: string, remarks: string | null = null, user = 'System'): Promise<void> {
  try {
    await supabase.from(AUDIT_TABLE).insert({ action, user, remarks });
  } catch {
    // audit failures should never block user operations
  }
}

export async function getActiveFile(): Promise<BomFile | null> {
  const { data, error } = await supabase
    .from(FILES_TABLE)
    .select('*')
    .eq('status', 'active')
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as BomFile | null;
}

export async function getAllFiles(): Promise<BomFile[]> {
  const { data, error } = await supabase
    .from(FILES_TABLE)
    .select('*')
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return (data as BomFile[]) ?? [];
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from(AUDIT_TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data as AuditEntry[]) ?? [];
}

export async function getNextVersion(): Promise<number> {
  const { data, error } = await supabase
    .from(FILES_TABLE)
    .select('version')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return 1;
  return data ? (data.version + 1) : 1;
}

export async function insertBomFile(
  file_name: string,
  version: number,
  bom_summary: unknown[],
  consumption_details: unknown[],
  total_bom: number,
  total_produced_items: number,
  total_consumption_items: number,
  uploaded_by: string,
): Promise<BomFile> {
  const { data, error } = await supabase
    .from(FILES_TABLE)
    .insert({
      file_name,
      version,
      status: 'active' as BomStatus,
      bom_summary,
      consumption_details,
      total_bom,
      total_produced_items,
      total_consumption_items,
      uploaded_by,
    })
    .select()
    .single();
  if (error) throw error;
  return data as BomFile;
}

export async function deactivateActiveFile(newFileName: string, deactivatedBy: string): Promise<void> {
  const active = await getActiveFile();
  if (!active) return;
  const { error } = await supabase
    .from(FILES_TABLE)
    .update({ status: 'inactive' as BomStatus, replaced_by: newFileName, deleted_by: deactivatedBy })
    .eq('id', active.id);
  if (error) throw error;
}

export async function deleteActiveFile(deletedBy: string): Promise<void> {
  const active = await getActiveFile();
  if (!active) return;
  const { error } = await supabase
    .from(FILES_TABLE)
    .update({ status: 'deleted' as BomStatus, deleted_by: deletedBy, deleted_at: new Date().toISOString() })
    .eq('id', active.id);
  if (error) throw error;
}

// ---------- Item Master ----------

export async function getItemMaster(): Promise<ItemMasterEntry[]> {
  const { data, error } = await supabase
    .from(ITEM_MASTER_TABLE)
    .select('*')
    .order('item_name', { ascending: true });
  if (error) throw error;
  return (data as ItemMasterEntry[]) ?? [];
}

export async function replaceItemMaster(
  entries: { item_name: string; item_code: string }[],
  uploadedBy: string,
): Promise<void> {
  const { error: delError } = await supabase
    .from(ITEM_MASTER_TABLE)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (delError) throw delError;

  if (entries.length === 0) return;

  const rows = entries.map((e) => ({
    item_name: e.item_name,
    item_code: e.item_code,
    uploaded_by: uploadedBy,
  }));

  const { error: insError } = await supabase
    .from(ITEM_MASTER_TABLE)
    .insert(rows);
  if (insError) throw insError;
}
