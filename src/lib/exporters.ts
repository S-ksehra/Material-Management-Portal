import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CalculationResult, TreeNode } from '@/types';

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
    `${prefix}${node.item}  (${node.quantity} ${node.unit})`
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
    ['Bill Of Material Name', 'Standard Qty', 'Finished Good', 'Production Qty', 'Unit', 'Calculation Date'],
    [
      result.summary.bom_name,
      result.summary.standard_qty,
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
      'Item',
      'Required Qty',
      'Unit',
    ],
    ...result.requirements.map((r) => [
      r.level,
      r.type,
      r.parent_bom,
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
      'Raw Material',
      'Parent BOM',
      'Total Qty',
      'Unit',
    ],
    ...result.raw_material_summary.map(
      (r) => [
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
      'Raw Material',
      'Parent BOM',
      'Total Qty',
      'Unit',
    ]],

    body:
      result.raw_material_summary.map(
        (r) => [
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
      `${prefix}${node.item} <span class="qty">(${node.quantity.toFixed(2)} ${node.unit})</span>`
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