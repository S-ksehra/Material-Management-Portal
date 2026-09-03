export type BomStatus = 'active' | 'inactive' | 'deleted';

export interface BomSummaryRow {
  bom_name: string;
  produced_item: string;
  quantity: number;
  unit: string;
  row_number: number;
}

export interface ConsumptionRow {
  bom_name: string;
  produced_item: string;
  consumption_item: string;
  unit: string;
  quantity: number;
  row_number: number;
}

export interface BomFile {
  id: string;
  file_name: string;
  version: number;
  status: BomStatus;
  bom_summary: BomSummaryRow[];
  consumption_details: ConsumptionRow[];
  total_bom: number;
  total_produced_items: number;
  total_consumption_items: number;
  uploaded_by: string;
  uploaded_at: string;
  replaced_by: string | null;
  deleted_by: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  user: string;
  remarks: string | null;
  created_at: string;
}

// Calculation result types
export type MaterialType =
  | 'Finished Good'
  | 'Semi Finished'
  | 'Raw Material';

export interface TreeNode {
  item: string;
  unit: string;
  quantity: number;
  level: number;
  type: MaterialType;
  parent_bom: string;
  children: TreeNode[];
}

export interface MaterialRequirementRow {
  level: number;
  type: MaterialType;
  item: string;
  unit: string;
  required_qty: number;
  parent_bom: string;
}

export interface RawMaterialSummaryRow {
  item: string;
  parent_bom: string;
  total_qty: number;
  unit: string;
}

export interface ProductionSummary {
  finished_good: string;
  production_qty: number;
  unit: string;
  bom_name: string;
  standard_qty: number;
  scaling_factor: number;
  calculation_date: string;
}

export interface CalculationResult {
  summary: ProductionSummary;
  tree: TreeNode;
  requirements: MaterialRequirementRow[];
  raw_material_summary: RawMaterialSummaryRow[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}