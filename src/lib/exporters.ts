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
    .split('|')
    .some(
      (part) =>
        part.trim().toLowerCase() ===
        stage.toLowerCase()
    );
}

function getCustomerName(bomName: string): string {
  return bomName.split('|')[0]?.trim() || '';
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
            <td>0</td><td>0</td><td>0</td><td>0</td>
            <td>0</td><td></td><td></td><td></td>
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

export function printStageWise(
  activeFile: BomFile,
  result: CalculationResult,
  companyName: string
): void {
  const stagePages = STAGE_NAMES.flatMap((stage) => {
    const stageSummaries = activeFile.bom_summary.filter(
      (summary) =>
        summary.produced_item ===
          result.summary.finished_good &&
        bomHasStage(summary.bom_name, stage)
    );

    if (stageSummaries.length === 0) return [];

    const stageSummary = stageSummaries[0];
    const stageBomNames = new Set(
      stageSummaries.map((summary) => summary.bom_name)
    );
    const stageMaterials = activeFile.consumption_details
      .filter(
        (row) =>
          row.produced_item ===
            result.summary.finished_good &&
          stageBomNames.has(row.bom_name)
      )
      .map((row) => ({
        item: row.consumption_item,
        quantity:
          row.quantity *
          (result.summary.production_qty /
            (stageSummary.quantity || 1)),
        unit: row.unit,
      }));

    return [{
      stage,
      summary: stageSummary,
      materials: stageMaterials,
    }];
  });

  const win = window.open(
    '',
    '_blank',
    'width=1280,height=800'
  );

  if (!win) return;

  if (stagePages.length === 0) {
    win.document.write(`
      <html><body style="font-family:Arial,sans-serif;padding:32px">
        No matching stage BOMs found for this produced item.
      </body></html>`);
    win.document.close();
    return;
  }

  const pages = stagePages
    .map((page, index) =>
      renderJobCardPage(
        companyName,
        page.stage,
        page.summary.bom_name,
        result.summary.finished_good,
        result.summary.item_code || '',
        result.summary.production_qty,
        page.summary.quantity,
        page.summary.unit,
        page.materials,
        index === stagePages.length - 1
      )
    )
    .join('');

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Stage Wise Job Cards</title>
        <style>
          * { box-sizing: border-box; }
          @page { size: landscape; margin: 10mm; }
          body {
            margin: 0;
            color: #111;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
          }
          .job-card { min-height: 180mm; }
          .job-title {
            background: #193754;
            color: #fff;
            font-size: 19px;
            font-weight: 700;
            text-align: center;
            padding: 4px 8px;
            margin-bottom: 8px;
          }
          .job-title span { padding: 0 8px; }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          td, th { border: 1px solid #222; }
          .details { font-size: 11px; }
          .details td { height: 18px; padding: 1px 3px; vertical-align: top; }
          .label { width: 12%; }
          .details .label { background: #f1f1f1; }
          .details .label-col { width: 12%; }
          .details .value-col { width: 68%; }
          .details .side-label-col { width: 12%; }
          .details .side-value-col { width: 8%; }
          .manual-label, .manual-value { color: #111; }
          .materials, .production { margin-top: 12px; }
          caption {
            border: 1px solid #222;
            border-bottom: 0;
            background: #dbe8ed;
            color: #244c54;
            font-weight: 700;
            text-align: left;
            padding: 2px 4px;
          }
          th {
            background: #193754;
            color: #fff;
            font-weight: 700;
            padding: 2px 3px;
            text-align: center;
          }
          .materials th:nth-child(1) { width: 80%; text-align: left; }
          .materials th:nth-child(2) { width: 12%; text-align: right; }
          .materials th:nth-child(3) { width: 8%; text-align: left; }
          .materials td { height: 26px; padding: 3px; }
          .materials td.qty { text-align: right; }
          .empty { text-align: center; color: #666; }
          .production { font-size: 10px; }
          .production th { white-space: nowrap; }
          .production td { height: 20px; padding: 2px; text-align: center; }
          .production .entry-row td { height: 76px; background: #eef6ff; }
          .production .total-row td { background: #dbe8ed; font-weight: 700; }
          .production .total-row td:first-child { text-align: left; }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin: 28px 3px 0;
            font-size: 11px;
          }
          .signatures b {
            display: inline-block;
            width: 120px;
            border-bottom: 1px solid #222;
            height: 12px;
            vertical-align: bottom;
          }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>${pages}
        <script>
          window.onload = function () { window.print(); };
        </script>
      </body>
    </html>`);
  win.document.close();
}