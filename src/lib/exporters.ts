import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  BomFile,
  CalculationResult,
  TreeNode,
} from '@/types';

const PRIMARY = '#761137';
const PRIMARY_HOVER = '#5E0D2B';
const FINISHED = '#14532D';
const SEMI = '#1E3A8A';
const RAW = '#92400E';

// ---------- Excel Export ----------

function treeToRows(
  node: TreeNode,
  prefix: string,
  rows: string[]
): void {
  rows.push(
    `${prefix}${node.item_code ? `[${node.item_code}]  ` : ''}${node.item}  (${node.quantity} ${node.unit})`
  );

  const childPrefix = prefix
    .replace(/─/g, ' ')
    .replace(/├/g, '│')
    .replace(/└/g, ' ') + '  ';

  node.children.forEach((child, i) => {
    const isLast =
      i === node.children.length - 1;

    treeToRows(
      child,
      childPrefix +
        (isLast ? '└── ' : '├── '),
      rows
    );
  });
}

export function exportToExcel(
  result: CalculationResult
): void {
  const wb = XLSX.utils.book_new();

  // ---------- Sheet 1: Production Summary ----------

  const summaryData = [
    ['Bill Of Material Name', 'Standard Qty', 'Item Code', 'Finished Good', 'Production Qty', 'Unit', 'Calculation Date'],
    [
      result.summary.bom_name,
      result.summary.standard_qty,
      result.summary.item_code || '',
      result.summary.finished_good,
      result.summary.production_qty,
      result.summary.unit,
      new Date(
        result.summary.calculation_date
      ).toLocaleString(),
    ],
  ];

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(summaryData),
    'Production Summary'
  );

  // ---------- Sheet 2: Material Hierarchy ----------

  const treeRows: string[] = [];

  treeToRows(
    result.tree,
    '',
    treeRows
  );

  const treeData = [
    ['Material Hierarchy'],
    ...treeRows.map((r) => [r]),
  ];

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(treeData),
    'Material Hierarchy'
  );

  // ---------- Sheet 3: Material Requirement ----------

  const reqData = [
    [
      'Level',
      'Type',
      'Parent BOM',
      'Item Code',
      'Item',
      'Required Qty',
      'Unit',
    ],
    ...result.requirements.map((r) => [
      r.level,
      r.type,
      r.parent_bom,
      r.item_code || '',
      r.item,
      r.required_qty,
      r.unit,
    ]),
  ];

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(reqData),
    'Material Requirement'
  );

  // ---------- Sheet 4: Raw Material Summary ----------
  // Parent BOM added

  const rawData = [
    [
      'Item Code',
      'Raw Material',
      'Parent BOM',
      'Total Qty',
      'Unit',
    ],
    ...result.raw_material_summary.map(
      (r) => [
        r.item_code || '',
        r.item,
        r.parent_bom,
        r.total_qty,
        r.unit,
      ]
    ),
  ];

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(rawData),
    'Raw Material Summary'
  );

  // Removed separate "Powered by Finverse" branding sheet

  XLSX.writeFile(
    wb,
    `BOM_Calculation_${result.summary.finished_good}_${Date.now()}.xlsx`
  );
}

// ---------- PDF Export ----------

function typeColor(
  type: string
): [number, number, number] {
  switch (type) {
    case 'Finished Good':
      return hexToRgb(FINISHED);

    case 'Semi Finished':
      return hexToRgb(SEMI);

    case 'Raw Material':
      return hexToRgb(RAW);

    default:
      return hexToRgb(PRIMARY);
  }
}

function hexToRgb(
  hex: string
): [number, number, number] {
  const h = hex.replace('#', '');

  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function exportToPdf(
  result: CalculationResult,
  companyName: string,
  logoDataUrl: string | null
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW =
    doc.internal.pageSize.getWidth();

  const pageH =
    doc.internal.pageSize.getHeight();

  const margin = 14;

  let y = margin;

  // ---------- Header Band ----------

  doc.setFillColor(
    ...hexToRgb(PRIMARY)
  );

  doc.rect(
    0,
    0,
    pageW,
    22,
    'F'
  );

  if (logoDataUrl) {
    try {
      doc.addImage(
        logoDataUrl,
        'PNG',
        margin,
        4,
        14,
        14
      );
    } catch {
      // Ignore bad logo
    }
  }

  doc.setTextColor(
    255,
    255,
    255
  );

  doc.setFontSize(16);

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.text(
    companyName ||
      'Material Requirement Report',
    logoDataUrl
      ? margin + 20
      : margin,
    14
  );

  doc.setFontSize(9);

  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.text(
    `Report Date: ${new Date().toLocaleString()}`,
    pageW - margin,
    14,
    {
      align: 'right',
    }
  );

  y = 30;

  // ---------- Production Summary ----------

  doc.setTextColor(
    ...hexToRgb('#2B2B2B')
  );

  doc.setFontSize(12);

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.text(
    'Production Summary',
    margin,
    y
  );

  y += 4;

  autoTable(doc, {
    startY: y,

    head: [[
      'Bill Of Material Name',
      'Standard Qty',
      'Item Code',
      'Finished Good',
      'Production Qty',
      'Unit',
      'Calculation Date',
    ]],

    body: [[
      result.summary.bom_name,
      String(
        result.summary.standard_qty
      ),
      result.summary.item_code || '',
      result.summary.finished_good,
      String(
        result.summary.production_qty
      ),
      result.summary.unit,
      new Date(
        result.summary.calculation_date
      ).toLocaleString(),
    ]],

    theme: 'grid',

    headStyles: {
      fillColor:
        hexToRgb(PRIMARY),
      textColor: 255,
      fontSize: 8,
    },

    bodyStyles: {
      fontSize: 8,
      textColor:
        hexToRgb('#2B2B2B'),
    },

    margin: {
      left: margin,
      right: margin,
    },
  });

  y =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY +
    8;

  doc.setFontSize(12);

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.text(
    'Material Requirement',
    margin,
    y
  );

  y += 4;

  autoTable(doc, {
    startY: y,

    head: [[
      'Level',
      'Type',
      'Parent BOM',
      'Item Code',
      'Item',
      'Required Qty',
      'Unit',
    ]],

    body:
      result.requirements.map(
        (r) => [
          r.level,
          r.type,
          r.parent_bom,
          r.item_code || '',
          r.item,
          r.required_qty.toFixed(4),
          r.unit,
        ]
      ),

    theme: 'grid',

    headStyles: {
      fillColor:
        hexToRgb(PRIMARY),
      textColor: 255,
      fontSize: 8,
    },

    bodyStyles: {
      fontSize: 8,
      textColor:
        hexToRgb('#2B2B2B'),
    },

    alternateRowStyles: {
      fillColor:
        hexToRgb('#F9F9F9'),
    },

    didParseCell: (data) => {
      if (
        data.section ===
          'body' &&
        data.column.index === 1
      ) {
        const type =
          String(data.cell.raw);

        data.cell.styles.textColor =
          typeColor(type);

        data.cell.styles.fontStyle =
          'bold';
      }
    },

    margin: {
      left: margin,
      right: margin,
    },
  });

  y =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY +
    8;

  if (y > pageH - 40) {
    doc.addPage();
    y = margin;
  }

  doc.setFontSize(12);

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.text(
    'Raw Material Summary',
    margin,
    y
  );

  y += 4;

  autoTable(doc, {
    startY: y,

    // Parent BOM added
    head: [[
      'Item Code',
      'Raw Material',
      'Parent BOM',
      'Total Qty',
      'Unit',
    ]],

    body:
      result.raw_material_summary.map(
        (r) => [
          r.item_code || '',
          r.item,
          r.parent_bom,
          r.total_qty.toFixed(4),
          r.unit,
        ]
      ),

    theme: 'grid',

    headStyles: {
      fillColor:
        hexToRgb(RAW),
      textColor: 255,
      fontSize: 8,
    },

    bodyStyles: {
      fontSize: 8,
      textColor:
        hexToRgb('#2B2B2B'),
    },

    alternateRowStyles: {
      fillColor:
        hexToRgb('#F9F9F9'),
    },

    margin: {
      left: margin,
      right: margin,
    },
  });

  // ---------- Footer with Page Numbers + Branding ----------

  const pageCount =
    doc.getNumberOfPages();

  for (
    let i = 1;
    i <= pageCount;
    i++
  ) {
    doc.setPage(i);

    // Normal footer area

    doc.setFontSize(8);

    doc.setTextColor(
      ...hexToRgb('#6B7280')
    );

    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.text(
      `${companyName || 'Material Requirement Report'} — Generated by Material Requirement Tool`,
      margin,
      pageH - 14
    );

    doc.text(
      `Page ${i} of ${pageCount}`,
      pageW - margin,
      pageH - 14,
      {
        align: 'right',
      }
    );

    // Finverse branding bar

    if (i === pageCount) {
      const barH = 9;

      const barY =
        pageH - barH;

      doc.setFillColor(
        ...hexToRgb(PRIMARY)
      );

      doc.rect(
        0,
        barY,
        pageW,
        barH,
        'F'
      );

      doc.setTextColor(
        255,
        255,
        255
      );

      doc.setFontSize(8.5);

      doc.setFont(
        'helvetica',
        'bold'
      );

      doc.text(
        'Powered by Finverse',
        pageW / 2,
        barY +
          barH / 2 +
          1,
        {
          align: 'center',
          baseline: 'middle',
        }
      );
    }
  }

  doc.save(
    `BOM_Calculation_${result.summary.finished_good}_${Date.now()}.pdf`
  );
}

// ---------- Print ----------

export function printResult(
  result: CalculationResult
): void {
  const win =
    window.open(
      '',
      '_blank',
      'width=1000,height=700'
    );

  if (!win) return;

  const treeLines: string[] = [];

  function buildTree(
    node: TreeNode,
    prefix: string
  ) {
    treeLines.push(
      `${prefix}${node.item_code ? `<span class="qty">[${node.item_code}]</span> ` : ''}${node.item} <span class="qty">(${node.quantity.toFixed(2)} ${node.unit})</span>`
    );

    const childPrefix = prefix
      .replace(/─/g, ' ')
      .replace(/├/g, '│')
      .replace(/└/g, ' ') +
      '  ';

    node.children.forEach(
      (child, i) => {
        buildTree(
          child,
          childPrefix +
            (i ===
            node.children.length -
              1
              ? '└── '
              : '├── ')
        );
      }
    );
  }

  buildTree(
    result.tree,
    ''
  );

  // ---------- Material Requirement Rows ----------

  const reqRows =
    result.requirements
      .map(
        (r) => `
    <tr>
      <td>${r.level}</td>

      <td>
        <span class="badge ${r.type.replace(
          /\s/g,
          ''
        )}">
          ${r.type}
        </span>
      </td>

      <td>${r.parent_bom}</td>

      <td>${r.item_code || '—'}</td>

      <td>${r.item}</td>

      <td style="text-align:right">
        ${r.required_qty.toFixed(
          4
        )}
      </td>

      <td>${r.unit}</td>
    </tr>`
      )
      .join('');

  // ---------- Raw Material Summary Rows ----------
  // Parent BOM added

  const rawRows =
    result.raw_material_summary
      .map(
        (r) => `
    <tr>
      <td>${r.item_code || '—'}</td>

      <td>${r.item}</td>

      <td>${r.parent_bom}</td>

      <td style="text-align:right">
        ${r.total_qty.toFixed(
          4
        )}
      </td>

      <td>${r.unit}</td>
    </tr>`
      )
      .join('');

  win.document.write(`
    <!DOCTYPE html>

    <html>

    <head>

      <title>
        Material Requirement Report
      </title>

      <style>

        * {
          box-sizing: border-box;
        }

        body {
          font-family: Arial, sans-serif;
          padding: 24px;
          padding-bottom: 80px;
          color: #2B2B2B;
        }

        h1 {
          color: #761137;
        }

        h2 {
          color: #761137;
          border-bottom: 2px solid #761137;
          padding-bottom: 4px;
          margin-top: 24px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          font-size: 12px;
        }

        th {
          background: #761137;
          color: #fff;
          padding: 6px 8px;
          text-align: left;
        }

        td {
          padding: 5px 8px;
          border-bottom: 1px solid #D8DDE6;
        }

        tr:nth-child(even) td {
          background: #F9F9F9;
        }

        .qty {
          color: #6B7280;
          font-size: 11px;
        }

        .badge {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: bold;
          color: #fff;
        }

        .FinishedGood {
          background: #14532D;
        }

        .SemiFinished {
          background: #1E3A8A;
        }

        .RawMaterial {
          background: #92400E;
        }

        .tree {
          font-family: monospace;
          font-size: 13px;
          line-height: 1.6;
          background: #F4ECEF;
          padding: 16px;
          border-radius: 8px;
        }

        .summary {
          background: #F4ECEF;
          padding: 12px 16px;
          border-radius: 8px;
          display: inline-block;
        }

        /* Finverse Branding */

        .branding-footer {
          margin-top: 32px;
          padding-top: 12px;
          border-top: 2px solid #761137;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          min-height: 42px;
          page-break-inside: avoid;
        }

        .branding-footer span {
          color: #761137;
          font-weight: 700;
          font-size: 14px;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        @media print {

          body {
            padding: 20px;
            padding-bottom: 70px;
          }

          .branding-footer {
            margin-top: 28px;
          }

        }

      </style>

    </head>

    <body>

      <h1>
        Material Requirement Report
      </h1>

      <div class="summary">

        <strong>Date:</strong>
        ${new Date(
          result.summary.calculation_date
        ).toLocaleString()}

        <br><br>

        <strong>
          Bill Of Material Name:
        </strong>

        ${result.summary.bom_name}

        &nbsp;|&nbsp;

        <strong>
          Standard Qty:
        </strong>

        ${result.summary.standard_qty}

        &nbsp;|&nbsp;

        <strong>
          Item Code:
        </strong>

        ${result.summary.item_code || '—'}

        &nbsp;|&nbsp;

        <strong>
          Finished Good:
        </strong>

        ${result.summary.finished_good}

        &nbsp;|&nbsp;

        <strong>
          Production Qty:
        </strong>

        ${result.summary.production_qty}

        ${result.summary.unit}

        &nbsp;&nbsp;

      </div>

      <h2>
        Material Hierarchy
      </h2>

      <div class="tree">
        ${treeLines.join(
          '<br>'
        )}
      </div>

      <h2>
        Material Requirement
      </h2>

      <table>

        <thead>

          <tr>
            <th>Level</th>
            <th>Type</th>
            <th>Parent BOM</th>
            <th>Item Code</th>
            <th>Item</th>
            <th>Required Qty</th>
            <th>Unit</th>
          </tr>

        </thead>

        <tbody>
          ${reqRows}
        </tbody>

      </table>

      <h2>
        Raw Material Summary
      </h2>

      <table>

        <thead>

          <tr>
            <th>Item Code</th>
            <th>Raw Material</th>
            <th>Parent BOM</th>
            <th>Total Qty</th>
            <th>Unit</th>
          </tr>

        </thead>

        <tbody>
          ${rawRows}
        </tbody>

      </table>

      <div class="branding-footer">
        <span>
          Powered by Finverse
        </span>
      </div>

      <script>
        window.onload = () =>
          window.print();
      </script>

    </body>

    </html>
  `);

  win.document.close();
}

// ---------- Stage-wise Job Card Print ----------

const STAGE_NAMES = [
  'SHEET CUTTER',
  'CORRUGATION',
  'PASTING',
  'DIE CUTTING',
  'PRINTING & STITCHING',
  'FINISHED GOODS',
] as const;

function escapePrintHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function printNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(4).replace(/\.?0+$/, '');
}

function bomHasStage(
  bomName: string,
  stage: string
): boolean {
  return bomName
    .split(/[|\-]/)
    .some(
      (part) =>
        part.trim().toLowerCase() ===
        stage.toLowerCase()
    );
}

function getCustomerName(bomName: string): string {
  return bomName.split(/[|\-]/)[0]?.trim() || '';
}

function getCutSpec(producedItem: string): string {
  return producedItem.match(/\[([^\]]+)\]/)?.[1]?.trim() || '';
}

function renderJobCardPage(
  companyName: string,
  stage: string,
  bomName: string,
  producedItem: string,
  itemCode: string,
  orderQuantity: number,
  standardQuantity: number,
  unit: string,
  materials: Array<{
    item: string;
    quantity: number;
    unit: string;
  }>,
  isLast: boolean
): string {
  const targetOutput =
    standardQuantity > 0
      ? orderQuantity / standardQuantity
      : orderQuantity;

  const plannedRows = materials.length
    ? materials
        .map(
          (material) => `
            <tr>
              <td>${escapePrintHtml(material.item)}</td>
              <td class="qty">${escapePrintHtml(printNumber(material.quantity))}</td>
              <td>${escapePrintHtml(material.unit)}</td>
            </tr>`
        )
        .join('')
    : `
            <tr>
              <td colspan="3" class="empty">No planned materials</td>
            </tr>`;

  const pageBreak = isLast
    ? ''
    : ' page-break-after: always;';

  return `
    <section class="job-card" style="${pageBreak}">
      <header class="job-title">
        ${escapePrintHtml(companyName || 'SAKSHI LAMINATES')}
        <span>|</span>
        ${escapePrintHtml(stage)} JOB CARD
      </header>

      <table class="details">
        <colgroup>
          <col class="label-col" />
          <col class="value-col" />
          <col class="side-label-col" />
          <col class="side-value-col" />
        </colgroup>
        <tbody>
          <tr>
            <td class="label">Customer</td>
            <td>${escapePrintHtml(getCustomerName(bomName))}</td>
            <td class="label manual-label">Job Card No.</td>
            <td class="manual-value"></td>
          </tr>
          <tr>
            <td class="label">FG Product</td>
            <td>${escapePrintHtml(producedItem)}</td>
            <td class="label manual-label">Job Card Date</td>
            <td class="manual-value"></td>
          </tr>
          <tr>
            <td class="label">FG Code</td>
            <td>${escapePrintHtml(itemCode)}</td>
            <td class="label manual-label">Production Order</td>
            <td class="manual-value"></td>
          </tr>
          <tr>
            <td class="label">FG Order Qty</td>
            <td>${escapePrintHtml(printNumber(orderQuantity))}</td>
            <td class="label manual-label">Production Date</td>
            <td class="manual-value"></td>
          </tr>
          <tr>
            <td class="label">Output Product</td>
            <td>${escapePrintHtml(producedItem)}</td>
            <td class="label manual-label">Machine</td>
            <td class="manual-value"></td>
          </tr>
          <tr>
            <td class="label">Output UOM</td>
            <td>${escapePrintHtml(unit)}</td>
            <td class="label manual-label">Supervisor</td>
            <td class="manual-value"></td>
          </tr>
          <tr>
            <td class="label">Target Output</td>
            <td>${escapePrintHtml(printNumber(targetOutput))}</td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td class="label">BOM / Reference</td>
            <td>${escapePrintHtml(bomName)}</td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td class="label">Cut / spec</td>
            <td>${escapePrintHtml(getCutSpec(producedItem))}</td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <table class="materials">
        <caption>PLANNED MATERIALS (from consolidated BOM)</caption>
        <thead>
          <tr>
            <th>Material</th>
            <th>Quantity</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>${plannedRows}</tbody>
      </table>

      <table class="production">
        <caption>DAILY / SHIFT-WISE PRODUCTION</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Shift</th>
            <th>Reel consumed (kg)</th>
            <th>Good output</th>
            <th>Waste / reject</th>
            <th>Total used</th>
            <th>Cumulative good</th>
            <th>Balance target</th>
            <th>Remarks</th>
            <th>Sign</th>
          </tr>
        </thead>
        <tbody>
          <tr class="entry-row">
            <td></td><td></td><td></td><td></td><td></td>
            <td></td><td></td><td></td><td></td><td></td>
            
          </tr>
          <tr class="total-row">
            <td colspan="2">TOTAL / STATUS</td>
            <td></td><td></td><td></td><td></td>
            <td></td><td></td><td></td><td></td>
          </tr>
        </tbody>
      </table>

      <div class="signatures">
        <span>Operator: <b></b></span>
        <span>Supervisor: <b></b></span>
        <span>Transfer checked: <b></b></span>
      </div>
    </section>`;
}

export interface StagePageData {
  stage: string;
  producedItem: string;
  itemCode: string;
  orderQty: number;
  standardQty: number;
  unit: string;
  bomName: string;
  materials: Array<{
    item: string;
    quantity: number;
    unit: string;
  }>;
}

// Builds ordered stage pages for the whole production chain:
// matched known stages first (STAGE_NAMES order), unmatched stages last.
export function buildStagePages(
  activeFile: BomFile,
  result: CalculationResult
): StagePageData[] {
  type StagePage = StagePageData;

  const rootScale = result.summary.scaling_factor;

  // Index BOM summary by produced_item for quick lookup
  const summaryByItem = new Map<string, BomFile['bom_summary'][number]>();
  activeFile.bom_summary.forEach((s) => {
    if (!summaryByItem.has(s.produced_item)) {
      summaryByItem.set(s.produced_item, s);
    }
  });

  // Index consumption by produced_item
  const consumptionByProduced = new Map<string, BomFile['consumption_details'][number][]>();
  activeFile.consumption_details.forEach((c) => {
    if (!consumptionByProduced.has(c.produced_item)) {
      consumptionByProduced.set(c.produced_item, []);
    }
    consumptionByProduced.get(c.produced_item)!.push(c);
  });

  // Traverse the calculation result tree to find all items in production chain
  // in order (deepest first, i.e. raw material stages first, finished good last)
  const orderedItems: string[] = [];
  const visited = new Set<string>();

  function traverseTree(node: TreeNode) {
    node.children.forEach((child) => {
      if (!visited.has(child.item)) {
        visited.add(child.item);
        traverseTree(child);
      }
    });
    if (!orderedItems.includes(node.item)) {
      orderedItems.push(node.item);
    }
  }

  traverseTree(result.tree);

  // Build a page for each item in the production chain
  const allPages: StagePage[] = [];

  for (const item of orderedItems) {
    const summary = summaryByItem.get(item);
    const cons = consumptionByProduced.get(item);

    // Skip items that have no BOM summary and no consumption (pure raw materials with no sub-assembly)
    if (!summary && (!cons || cons.length === 0)) continue;

    const bomName = summary?.bom_name || '';
    const standardQty = summary?.quantity || 1;
    const unit = summary?.unit || '';
    const reqRow = result.requirements.find((r) => r.item === item);
    const itemCode = reqRow?.item_code || '';
    const orderQty = reqRow?.required_qty || result.summary.production_qty;

    // Determine stage name from BOM name
    const stageName = bomName.split(/[|\-]/)[1]?.trim() || item;

    const materials: StagePage['materials'] = cons
      ? cons.map((row) => ({
          item: row.consumption_item,
          quantity: row.quantity * (orderQty / standardQty || rootScale),
          unit: row.unit,
        }))
      : [];

    allPages.push({
      stage: stageName,
      producedItem: item,
      itemCode,
      orderQty,
      standardQty,
      unit,
      bomName,
      materials,
    });
  }

  // Try to match known stage names; put matched first (in STAGE_NAMES order), unmatched at end
  const matchedPages: StagePage[] = [];
  const unmatchedPages: StagePage[] = [];

  for (const page of allPages) {
    const matchedStage = STAGE_NAMES.find((stage) =>
      bomHasStage(page.bomName, stage)
    );
    if (matchedStage) {
      matchedPages.push({ ...page, stage: matchedStage });
    } else {
      unmatchedPages.push(page);
    }
  }

  // Sort matched pages by STAGE_NAMES order
  matchedPages.sort((a, b) => {
    const aIdx = STAGE_NAMES.indexOf(
      STAGE_NAMES.find((s) => bomHasStage(a.bomName, s))!
    );
    const bIdx = STAGE_NAMES.indexOf(
      STAGE_NAMES.find((s) => bomHasStage(b.bomName, s))!
    );
    return aIdx - bIdx;
  });

  return [...matchedPages, ...unmatchedPages];
}

export function printStageWise(
  activeFile: BomFile,
  result: CalculationResult,
  companyName: string,
  selectedStages?: string[]
): void {
  const producedItem = result.summary.finished_good;

  const allPages = buildStagePages(activeFile, result);

  const stagePages =
    selectedStages && selectedStages.length > 0
      ? allPages.filter((page) => selectedStages.includes(page.stage))
      : allPages;

  if (stagePages.length === 0) return;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 10;
  const contentW = pageW - margin * 2;

  stagePages.forEach((page, pageIndex) => {
    if (pageIndex > 0) doc.addPage();

    doc.setFillColor(25, 55, 84);
    doc.rect(margin, 8, contentW, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(
      `${companyName || 'SAKSHI LAMINATES'} | ${page.stage} JOB CARD`,
      pageW / 2,
      13.5,
      { align: 'center' }
    );

    const customer = getCustomerName(page.bomName);
    const cutSpec = getCutSpec(page.producedItem);
    const details = [
      ['Customer', customer, 'Job Card No.', ''],
      ['FG Product', producedItem, 'Job Card Date', ''],
      ['FG Code', result.summary.item_code || '', 'Production Order', ''],
      ['FG Order Qty', printNumber(result.summary.production_qty), 'Production Date', ''],
      ['Output Product', page.producedItem, 'Machine', ''],
      ['Output UOM', page.unit, 'Supervisor', ''],
      ['Target Output', printNumber(page.orderQty), '', ''],
      ['BOM / Reference', page.bomName, '', ''],
      ['Cut / spec', cutSpec, '', ''],
    ];

    autoTable(doc, {
      startY: 19,
      body: details,
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        textColor: [17, 17, 17],
        cellPadding: 1.1,
        minCellHeight: 5.7,
        lineColor: [34, 34, 34],
        lineWidth: 0.25,
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 172 },
        2: { cellWidth: 34 },
        3: { cellWidth: contentW - 35 - 172 - 34 },
      },
      didParseCell: (data) => {
        if (
          data.section === 'body' &&
          (data.column.index === 0 || data.column.index === 2)
        ) {
          data.cell.styles.fillColor = [241, 241, 241];
        }
      },
    });

    let y =
      (doc as unknown as { lastAutoTable: { finalY: number } })
        .lastAutoTable.finalY + 5;

    const addSectionTitle = (title: string): void => {
      doc.setFillColor(219, 232, 237);
      doc.setDrawColor(34, 34, 34);
      doc.rect(margin, y, contentW, 6, 'FD');
      doc.setTextColor(36, 76, 84);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(title, margin + 1, y + 4.2);
      y += 6;
    };

    addSectionTitle('PLANNED MATERIALS (from consolidated BOM)');

    autoTable(doc, {
      startY: y,
      head: [['Material', 'Quantity', 'Unit']],
      body:
        page.materials.length > 0
          ? page.materials.map((material) => [
              material.item,
              printNumber(material.quantity),
              material.unit,
            ])
          : [['No planned materials', '', '']],
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 1.4,
        lineColor: [34, 34, 34],
        lineWidth: 0.25,
      },
      headStyles: {
        fillColor: [25, 55, 84],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: contentW - 60 },
        1: { cellWidth: 35, halign: 'right' },
        2: { cellWidth: 25 },
      },
    });

    y =
      (doc as unknown as { lastAutoTable: { finalY: number } })
        .lastAutoTable.finalY + 5;

    addSectionTitle('DAILY / SHIFT-WISE PRODUCTION');

    const productionHeaders = [
      'Date',
      'Shift',
      'Reel consumed (kg)',
      'Good output',
      'Waste / reject',
      'Total used',
      'Cumulative good',
      'Balance target',
      'Remarks',
      'Sign',
    ];
    const blankProductionRow = productionHeaders.map(() => '');
    const totalProductionRow = [
      'TOTAL / STATUS',
      '',
      '0',
      '0',
      '0',
      '0',
      '0',
      '',
      '',
      '',
    ];

    autoTable(doc, {
      startY: y,
      head: [productionHeaders],
      body: [blankProductionRow, totalProductionRow],
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 6.8,
        cellPadding: 1.2,
        halign: 'center',
        lineColor: [34, 34, 34],
        lineWidth: 0.25,
      },
      headStyles: {
        fillColor: [25, 55, 84],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      bodyStyles: { minCellHeight: 5.5 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 16 },
        2: { cellWidth: 29 },
        3: { cellWidth: 22 },
        4: { cellWidth: 24 },
        5: { cellWidth: 21 },
        6: { cellWidth: 27 },
        7: { cellWidth: 25 },
        8: { cellWidth: 49 },
        9: { cellWidth: contentW - 235 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === 0) {
          data.cell.styles.minCellHeight = 25;
          data.cell.styles.fillColor = [238, 246, 255];
        }
        if (data.section === 'body' && data.row.index === 1) {
          data.cell.styles.fillColor = [219, 232, 237];
          data.cell.styles.fontStyle = 'bold';
        }
        if (
          data.section === 'body' &&
          data.row.index === 1 &&
          data.column.index === 0
        ) {
          data.cell.styles.halign = 'left';
        }
      },
    });

    y =
      (doc as unknown as { lastAutoTable: { finalY: number } })
        .lastAutoTable.finalY + 11;
    doc.setTextColor(17, 17, 17);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Operator:', margin + 1, y);
    doc.line(margin + 17, y + 0.5, margin + 47, y + 0.5);
    doc.text('Supervisor:', pageW / 2 - 30, y);
    doc.line(pageW / 2 - 10, y + 0.5, pageW / 2 + 20, y + 0.5);
    doc.text('Transfer checked:', pageW - 70, y);
    doc.line(pageW - 35, y + 0.5, pageW - margin, y + 0.5);
  });

  doc.save(
    `Stage_Wise_Job_Cards_${result.summary.finished_good}_${Date.now()}.pdf`
  );
}