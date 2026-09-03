import * as XLSX from 'xlsx';
import type {
  BomSummaryRow,
  ConsumptionRow,
  ValidationResult,
  CalculationResult,
  TreeNode,
  MaterialRequirementRow,
  RawMaterialSummaryRow,
  MaterialType,
  ProductionSummary,
} from '@/types';

// ---------- Excel Parsing ----------

function cellToString(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function normalizeBomName(name: string): string {
  return name
    .normalize('NFKC')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/[‐-‒–—―]/g, '-')
    .replace(/[×✕]/g, '*')
    .replace(/\s*([-*])\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function cellToNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;

  const n =
    typeof val === 'number'
      ? val
      : parseFloat(String(val).replace(/,/g, ''));

  return isNaN(n) ? null : n;
}

export interface ParsedBom {
  bomSummary: BomSummaryRow[];
  consumptionDetails: ConsumptionRow[];
}

// Normalize text for matching: lowercase, collapse whitespace, strip punctuation.
function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[\s_\-./\\]+/g, ' ').trim();
}

// Match a sheet name fuzzily — case-insensitive, tolerant of typos and extra words.
function matchSheetName(
  names: string[],
  target: string
): string | null {
  const normalizedTarget = normalizeText(target);

  // Exact match first
  for (const n of names) {
    if (normalizeText(n) === normalizedTarget) return n;
  }

  // Substring match
  for (const n of names) {
    const norm = normalizeText(n);

    if (
      norm.includes(normalizedTarget) ||
      normalizedTarget.includes(norm)
    ) {
      return n;
    }
  }

  // Word-level match
  const targetWords = normalizedTarget
    .split(' ')
    .filter((w) => w.length >= 3);

  for (const n of names) {
    const norm = normalizeText(n);
    const sheetWords = norm.split(' ');

    const allMatch = targetWords.every((tw) =>
      sheetWords.some((sw) => {
        if (sw === tw) return true;

        // Prefix match for words >= 5 chars
        if (tw.length >= 5 && sw.length >= 5) {
          const prefix = tw.slice(
            0,
            Math.min(tw.length, sw.length, 6)
          );

          return (
            sw.startsWith(prefix) ||
            tw.startsWith(sw.slice(0, 6))
          );
        }

        return false;
      })
    );

    if (allMatch) return n;
  }

  return null;
}

// Expected column header aliases
const SUMMARY_COL_ALIASES: Record<string, string[]> = {
  bom_name: [
    'bom name',
    'bom',
    'bom no',
    'bom number',
    'bill of material',
    'bomname',
  ],
  produced_item: [
    'produced item',
    'produceditem',
    'item',
    'product',
    'finished good',
    'produced',
    'produced item name',
  ],
  quantity: [
    'quantity',
    'qty',
    'std qty',
    'standard qty',
    'standard quantity',
    'quantity per',
    'qty per',
  ],
  unit: [
    'unit',
    'uom',
    'unit of measure',
    'measurement',
  ],
};

const CONSUMPTION_COL_ALIASES: Record<string, string[]> = {
  bom_name: [
    'bom name',
    'bom',
    'bom no',
    'bom number',
    'bill of material',
    'bomname',
  ],
  produced_item: [
    'produced item',
    'produceditem',
    'item',
    'product',
    'finished good',
    'produced',
    'produced item name',
  ],
  consumption_item: [
    'consumption item',
    'consumptionitem',
    'raw material',
    'component',
    'material',
    'consumption item name',
    'consumed item',
    'child item',
  ],
  unit: [
    'unit',
    'uom',
    'unit of measure',
    'measurement',
  ],
  quantity: [
    'quantity',
    'qty',
    'consumption qty',
    'quantity per',
    'qty per',
    'consumption quantity',
  ],
};

// Find header row
function findHeader(
  rows: unknown[][],
  requiredCols: string[],
  aliases: Record<string, string[]>,
  minMatchRatio = 0.6
): {
  headerIndex: number;
  colMap: Record<string, number>;
} | null {
  const maxScan = Math.min(rows.length, 30);

  for (let i = 0; i < maxScan; i++) {
    const row = rows[i];

    const colMap: Record<string, number> = {};
    let matched = 0;

    for (let col = 0; col < row.length; col++) {
      const headerText = normalizeText(
        cellToString(row[col])
      );

      if (!headerText) continue;

      for (const [field, fieldAliases] of Object.entries(
        aliases
      )) {
        if (field in colMap) continue;

        for (const alias of fieldAliases) {
          if (
            headerText === alias ||
            headerText.includes(alias)
          ) {
            if (
              Object.values(colMap).includes(col)
            ) {
              break;
            }

            colMap[field] = col;
            matched++;
            break;
          }
        }
      }
    }

    const ratio = matched / requiredCols.length;

    if (ratio >= minMatchRatio) {
      return {
        headerIndex: i,
        colMap,
      };
    }
  }

  return null;
}

// Read data rows after the header.
function readDataRows(
  rows: unknown[][],
  headerIndex: number,
  _colMap: Record<string, number>
): {
  row: unknown[];
  excelRow: number;
}[] {
  const out: {
    row: unknown[];
    excelRow: number;
  }[] = [];

  for (
    let i = headerIndex + 1;
    i < rows.length;
    i++
  ) {
    const row = rows[i];

    const sl = cellToNumber(row[0]);

    if (sl === null || sl < 1) continue;

    out.push({
      row,
      excelRow: i + 1,
    });
  }

  return out;
}

export function parseBomExcel(
  file: ArrayBuffer
): ParsedBom {
  const wb = XLSX.read(file, {
    type: 'array',
  });

  const result: ParsedBom = {
    bomSummary: [],
    consumptionDetails: [],
  };

  // ---------- BOM Summary ----------

  const summarySheetName = matchSheetName(
    wb.SheetNames,
    'BOM Summary'
  );

  if (summarySheetName) {
    const ws = wb.Sheets[summarySheetName];

    const rows: unknown[][] =
      XLSX.utils.sheet_to_json(ws, {
        header: 1,
        blankrows: true,
        defval: null,
      });

    const header = findHeader(
      rows,
      [
        'bom_name',
        'produced_item',
        'quantity',
      ],
      SUMMARY_COL_ALIASES
    );

    if (header) {
      const dataRows = readDataRows(
        rows,
        header.headerIndex,
        header.colMap
      );

      dataRows.forEach(
        ({ row, excelRow }) => {
          const bomName = cellToString(
            row[header.colMap.bom_name]
          );

          const producedItem = cellToString(
            row[header.colMap.produced_item]
          );

          const quantity =
            header.colMap.quantity !== undefined
              ? cellToNumber(
                  row[header.colMap.quantity]
                )
              : null;

          const unit =
            header.colMap.unit !== undefined
              ? cellToString(
                  row[header.colMap.unit]
                )
              : '';

          result.bomSummary.push({
            bom_name: bomName,
            produced_item: producedItem,
            quantity: quantity ?? 0,
            unit,
            row_number: excelRow,
          });
        }
      );
    }
  }

  // ---------- Consumption Details ----------

  const consumptionSheetName =
    matchSheetName(
      wb.SheetNames,
      'Consumption details'
    );

  if (consumptionSheetName) {
    const ws =
      wb.Sheets[consumptionSheetName];

    const rows: unknown[][] =
      XLSX.utils.sheet_to_json(ws, {
        header: 1,
        blankrows: true,
        defval: null,
      });

    const header = findHeader(
      rows,
      [
        'bom_name',
        'produced_item',
        'consumption_item',
        'quantity',
      ],
      CONSUMPTION_COL_ALIASES
    );

    if (header) {
      const dataRows = readDataRows(
        rows,
        header.headerIndex,
        header.colMap
      );

      dataRows.forEach(
        ({ row, excelRow }) => {
          const bomName = cellToString(
            row[header.colMap.bom_name]
          );

          const producedItem = cellToString(
            row[header.colMap.produced_item]
          );

          const consumptionItem =
            cellToString(
              row[header.colMap.consumption_item]
            );

          const unit =
            header.colMap.unit !== undefined
              ? cellToString(
                  row[header.colMap.unit]
                )
              : '';

          const quantity =
            header.colMap.quantity !== undefined
              ? cellToNumber(
                  row[header.colMap.quantity]
                )
              : null;

          result.consumptionDetails.push({
            bom_name: bomName,
            produced_item: producedItem,
            consumption_item: consumptionItem,
            unit,
            quantity: quantity ?? 0,
            row_number: excelRow,
          });
        }
      );
    }
  }

  return result;
}

// ---------- Validation ----------

export function validateBom(
  parsed: ParsedBom
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Sheet presence
  if (parsed.bomSummary.length === 0) {
    errors.push(
      'Sheet "BOM Summary" is missing, has no recognizable header row, or has no data rows.'
    );
  }

  if (
    parsed.consumptionDetails.length === 0
  ) {
    errors.push(
      'Sheet "Consumption details" is missing, has no recognizable header row, or has no data rows.'
    );
  }

  // BOM Summary checks
  const bomNames = new Set<string>();

  const producedInSummary =
    new Map<string, BomSummaryRow>();

  parsed.bomSummary.forEach((r) => {
    if (!r.bom_name) {
      errors.push(
        `BOM Summary row ${r.row_number}: Blank BOM Name.`
      );
    }

    if (!r.produced_item) {
      errors.push(
        `BOM Summary row ${r.row_number}: Blank Produced Item.`
      );
    }

    if (
      r.quantity === null ||
      isNaN(r.quantity)
    ) {
      errors.push(
        `BOM Summary row ${r.row_number}: Invalid Quantity.`
      );
    } else if (r.quantity === 0) {
      warnings.push(
        `BOM Summary row ${r.row_number}: Quantity is zero.`
      );
    }

    if (r.bom_name) {
      const normalizedBomName =
        normalizeBomName(r.bom_name);

      if (
        bomNames.has(normalizedBomName)
      ) {
        warnings.push(
          `BOM Summary row ${r.row_number}: Duplicate BOM Name "${r.bom_name}".`
        );
      }

      bomNames.add(normalizedBomName);
    }

    if (r.produced_item) {
      if (
        producedInSummary.has(
          r.produced_item
        )
      ) {
        errors.push(
          `BOM Summary row ${r.row_number}: Duplicate Produced Item "${r.produced_item}" — each produced item should map to one BOM.`
        );
      }

      producedInSummary.set(
        r.produced_item,
        r
      );
    }
  });

  // Consumption checks
  const producedInConsumption =
    new Set<string>();

  parsed.consumptionDetails.forEach((r) => {
    if (!r.bom_name) {
      errors.push(
        `Consumption row ${r.row_number}: Blank BOM Name.`
      );
    }

    if (!r.produced_item) {
      errors.push(
        `Consumption row ${r.row_number}: Blank Produced Item.`
      );
    }

    if (!r.consumption_item) {
      errors.push(
        `Consumption row ${r.row_number}: Blank Consumption Item.`
      );
    }

    if (
      r.quantity === null ||
      isNaN(r.quantity)
    ) {
      errors.push(
        `Consumption row ${r.row_number}: Invalid Quantity.`
      );
    } else if (r.quantity === 0) {
      warnings.push(
        `Consumption row ${r.row_number}: Quantity is zero.`
      );
    }

    producedInConsumption.add(
      r.produced_item
    );
  });

  // Missing BOM in summary
  parsed.consumptionDetails.forEach((r) => {
    if (
      r.produced_item &&
      r.bom_name &&
      !bomNames.has(
        normalizeBomName(r.bom_name)
      )
    ) {
      warnings.push(
        `Consumption row ${r.row_number}: BOM Name "${r.bom_name}" not found in BOM Summary.`
      );
    }
  });

  // Circular reference detection
  const producedSet = new Set(
    producedInSummary.keys()
  );

  const adj = new Map<
    string,
    string[]
  >();

  parsed.consumptionDetails.forEach((r) => {
    if (
      r.produced_item &&
      r.consumption_item &&
      producedSet.has(
        r.consumption_item
      )
    ) {
      if (
        !adj.has(r.produced_item)
      ) {
        adj.set(
          r.produced_item,
          []
        );
      }

      adj
        .get(r.produced_item)!
        .push(r.consumption_item);
    }
  });

  const circularChains: string[] = [];

  for (const start of producedSet) {
    const visited = new Set<string>();
    const path: string[] = [start];

    const detect = (
      node: string
    ): boolean => {
      const neighbors = adj.get(node);

      if (!neighbors) return false;

      for (const nb of neighbors) {
        if (nb === start) {
          circularChains.push(
            [...path, nb].join(' → ')
          );

          return true;
        }

        if (!visited.has(nb)) {
          visited.add(nb);
          path.push(nb);

          if (detect(nb)) return true;

          path.pop();
        }
      }

      return false;
    };

    detect(start);
  }

  if (circularChains.length > 0) {
    const unique = [
      ...new Set(circularChains),
    ];

    errors.push(
      `Circular BOM reference detected: ${unique
        .slice(0, 3)
        .join('; ')}${
        unique.length > 3
          ? '...'
          : ''
      }`
    );
  }

  if (
    warnings.length === 0 &&
    producedInConsumption.size >
      producedInSummary.size
  ) {
    warnings.push(
      'Some produced items in Consumption details are not present in BOM Summary.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ---------- BOM Explosion ----------

export function calculateBom(
  bomSummary: BomSummaryRow[],
  consumptionDetails: ConsumptionRow[],
  producedItem: string,
  productionQty: number
): CalculationResult {
  // Lookup maps
  const summaryByItem =
    new Map<string, BomSummaryRow>();

  bomSummary.forEach((s) =>
    summaryByItem.set(
      s.produced_item,
      s
    )
  );

  // produced_item -> consumption rows
  const consumptionByProduced =
    new Map<
      string,
      ConsumptionRow[]
    >();

  consumptionDetails.forEach((c) => {
    if (
      !consumptionByProduced.has(
        c.produced_item
      )
    ) {
      consumptionByProduced.set(
        c.produced_item,
        []
      );
    }

    consumptionByProduced
      .get(c.produced_item)!
      .push(c);
  });

  // Items that have a BOM
  const hasBom = (
    item: string
  ): boolean =>
    consumptionByProduced.has(item) &&
    consumptionByProduced.get(item)!
      .length > 0;

  const rootSummary =
    summaryByItem.get(producedItem);

  const standardQty =
    rootSummary?.quantity ?? 1;

  const unit =
    rootSummary?.unit ?? '';

  const bomName =
    rootSummary?.bom_name ?? '';

  const scalingFactor =
    productionQty /
    (standardQty || 1);

  const summary: ProductionSummary = {
    finished_good: producedItem,
    production_qty: productionQty,
    unit,
    bom_name: bomName,
    standard_qty: standardQty,
    scaling_factor: scalingFactor,
    calculation_date:
      new Date().toISOString(),
  };

  // ---------- Build Material Tree ----------

  const classify = (
    item: string,
    isRoot: boolean
  ): MaterialType => {
    if (isRoot) {
      return 'Finished Good';
    }

    return hasBom(item)
      ? 'Semi Finished'
      : 'Raw Material';
  };

  const rootNode: TreeNode = {
    item: producedItem,
    unit,
    quantity: productionQty,
    level: 0,
    type: 'Finished Good',
    parent_bom: bomName,
    children: [],
  };

  const buildStack: {
    node: TreeNode;
    item: string;
    level: number;
    parentBom: string;
  }[] = [
    {
      node: rootNode,
      item: producedItem,
      level: 0,
      parentBom: bomName,
    },
  ];

  while (buildStack.length > 0) {
    const frame =
      buildStack.pop()!;

    const cons =
      consumptionByProduced.get(
        frame.item
      );

    if (!cons) continue;

    for (const c of cons) {
      const childQty =
        c.quantity *
        scalingFactor;

      const childItem =
        c.consumption_item;

      const childType =
        classify(
          childItem,
          false
        );

      const childSummary =
        summaryByItem.get(
          childItem
        );

      const childNode: TreeNode = {
        item: childItem,
        unit:
          c.unit ||
          childSummary?.unit ||
          '',
        quantity: childQty,
        level:
          frame.level + 1,
        type: childType,
        parent_bom: c.bom_name,
        children: [],
      };

      frame.node.children.push(
        childNode
      );

      if (
        childType ===
        'Semi Finished'
      ) {
        buildStack.push({
          node: childNode,
          item: childItem,
          level:
            frame.level + 1,
          parentBom:
            c.bom_name,
        });
      }
    }
  }

  // ---------- Flatten Requirements ----------

  const requirements: MaterialRequirementRow[] = [];

  const flattenStack: TreeNode[] = [
    rootNode,
  ];

  while (
    flattenStack.length > 0
  ) {
    const n =
      flattenStack.pop()!;

    requirements.push({
      level: n.level,
      type: n.type,
      item: n.item,
      unit: n.unit,
      required_qty: n.quantity,
      parent_bom: n.parent_bom,
    });

    // Push children in reverse
    // so original order is preserved.
    for (
      let i =
        n.children.length - 1;
      i >= 0;
      i--
    ) {
      flattenStack.push(
        n.children[i]
      );
    }
  }

  // ---------- Raw Material Summary ----------
  //
  // IMPORTANT:
  // Raw materials are grouped by:
  //   1. Raw Material
  //   2. Unit
  //   3. Parent BOM
  //
  // Therefore:
  // Same RM + same Parent BOM + same Unit
  //     => quantities are merged
  //
  // Same RM + different Parent BOM
  //     => separate rows

  const rawMap =
    new Map<
      string,
      RawMaterialSummaryRow
    >();

  requirements.forEach((r) => {
    if (
      r.type !== 'Raw Material'
    ) {
      return;
    }

    const key =
      `${r.item}__${r.unit}__${r.parent_bom}`;

    if (rawMap.has(key)) {
      rawMap.get(
        key
      )!.total_qty +=
        r.required_qty;
    } else {
      rawMap.set(key, {
        item: r.item,
        parent_bom:
          r.parent_bom,
        total_qty:
          r.required_qty,
        unit: r.unit,
      });
    }
  });

  const rawMaterialSummary =
    Array.from(
      rawMap.values()
    ).sort((a, b) => {
      const itemCompare =
        a.item.localeCompare(
          b.item
        );

      if (
        itemCompare !== 0
      ) {
        return itemCompare;
      }

      return a.parent_bom.localeCompare(
        b.parent_bom
      );
    });

  return {
    summary,
    tree: rootNode,
    requirements,
    raw_material_summary:
      rawMaterialSummary,
  };
}

// ---------- Distinct produced items for dropdown ----------

export function getDistinctProducedItems(
  consumptionDetails: ConsumptionRow[]
): string[] {
  const set = new Set<string>();

  consumptionDetails.forEach(
    (c) => {
      if (c.produced_item) {
        set.add(
          c.produced_item
        );
      }
    }
  );

  return Array.from(set).sort(
    (a, b) =>
      a.localeCompare(b)
  );
}