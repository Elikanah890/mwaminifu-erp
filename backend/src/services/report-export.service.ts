import { reportService } from './report.service';
import { analyticsService } from './analytics.service';
import prisma from '../config/database';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

const REPORT_TYPES = [
  'sales',
  'inventory',
  'profit',
  'expenses',
  'credit',
  'loans',
  'cashflow',
  'employees',
  'payment-methods',
  'products',
  'suppliers',
  'customers',
  'valuation',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

interface FlatReport {
  title: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

const isReportType = (value: string): value is ReportType =>
  (REPORT_TYPES as readonly string[]).includes(value);

const isExportFormat = (value: string): value is ExportFormat =>
  value === 'csv' || value === 'xlsx' || value === 'pdf';

function asNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0) || 0;
}

function formatDate(value: unknown): string {
  const d = value ? new Date(value as string) : null;
  if (!d || isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function flattenRow(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === null || v === undefined) {
      out[k] = '';
    } else if (typeof v === 'object') {
      out[k] = JSON.stringify(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function buildReport(shopId: string, type: ReportType, from?: string, to?: string): Promise<FlatReport> {
  switch (type) {
    case 'sales': {
      const r = await reportService.salesReport(shopId, from, to);
      const rows = (r.data || []).map((s) => ({
        Receipt: s.receiptNumber ?? '',
        Date: formatDate(s.saleDate),
        Cashier: s.user?.name ?? '',
        Customer: s.customer?.name ?? '',
        Items: (s.items || []).reduce((n: number, i) => n + (i.quantity || 0), 0),
        Total: asNumber(s.grandTotal),
        Method: s.paymentMethod ?? '',
        Status: s.status ?? '',
      }));
      return {
        title: 'Sales Report',
        columns: ['Receipt', 'Date', 'Cashier', 'Customer', 'Items', 'Total', 'Method', 'Status'],
        rows: rows.map(flattenRow),
      };
    }
    case 'inventory': {
      const r = await reportService.inventoryValuation(shopId);
      const rows = (r.data || []).map((p) => ({
        Name: p.name ?? '',
        SKU: p.sku ?? '',
        'Cost Price': asNumber(p.costPrice),
        'Selling Price': asNumber(p.sellingPrice),
        'Stock Quantity': asNumber(p.stockQuantity),
        'Stock Value': asNumber(p.costPrice) * asNumber(p.stockQuantity),
      }));
      return {
        title: 'Inventory Valuation',
        columns: ['Name', 'SKU', 'Cost Price', 'Selling Price', 'Stock Quantity', 'Stock Value'],
        rows: rows.map(flattenRow),
      };
    }
    case 'profit': {
      const r = await reportService.profitReport(shopId, from, to);
      const rows = (r.expensesByCategory || []).map((c) => ({
        Category: c.category ?? '',
        Total: asNumber(c.total),
      }));
      return {
        title: 'Profit Report',
        columns: ['Category', 'Total'],
        rows: rows.map(flattenRow),
      };
    }
    case 'expenses': {
      const r = await reportService.expensesReport(shopId, from, to);
      const rows = (r.data || []).map((e) => ({
        Category: e.category ?? '',
        Amount: asNumber(e.amount),
        Description: e.description ?? '',
        Date: formatDate(e.expenseDate),
        RecordedBy: e.user?.name ?? '',
      }));
      return {
        title: 'Expenses Report',
        columns: ['Category', 'Amount', 'Description', 'Date', 'RecordedBy'],
        rows: rows.map(flattenRow),
      };
    }
    case 'credit': {
      const r = await reportService.creditReport(shopId);
      const rows = (r.data || []).map((c) => ({
        Customer: c.name ?? '',
        Phone: c.phone ?? '',
        'Outstanding Balance': asNumber(c.outstandingBalance),
      }));
      return {
        title: 'Credit Report',
        columns: ['Customer', 'Phone', 'Outstanding Balance'],
        rows: rows.map(flattenRow),
      };
    }
    case 'loans': {
      const r = await reportService.loansReport(shopId);
      const rows = (r.data || []).map((l) => ({
        Lender: l.lender ?? '',
        Amount: asNumber(l.amount),
        'Remaining Balance': asNumber(l.remainingBalance),
        'Interest Rate': asNumber(l.interestRate),
        'Due Date': formatDate(l.dueDate),
        Status: l.status ?? '',
      }));
      return {
        title: 'Loans Report',
        columns: ['Lender', 'Amount', 'Remaining Balance', 'Interest Rate', 'Due Date', 'Status'],
        rows: rows.map(flattenRow),
      };
    }
    case 'cashflow': {
      const r = await reportService.cashFlowReport(shopId, from, to);
      const s = (r.summary as Record<string, unknown>) || {};
      return {
        title: 'Cash Flow Report',
        columns: ['Metric', 'Value'],
        rows: [
          { Metric: 'Total Inflow', Value: asNumber(s.totalInflow) },
          { Metric: 'Total Outflow', Value: asNumber(s.totalOutflow) },
          { Metric: 'Net Cash Flow', Value: asNumber(s.netCashFlow) },
          { Metric: 'Credit Collections', Value: asNumber(s.creditCollections) },
        ],
      };
    }
    case 'employees': {
      const r = await reportService.employeeReport(shopId, from, to);
      const rows = (r.data || []).map((e) => ({
        Name: e.name ?? '',
        Role: e.role ?? '',
        'Total Sales': asNumber(e.totalSales),
        Transactions: asNumber(e.totalTransactions),
      }));
      return {
        title: 'Employee Performance Report',
        columns: ['Name', 'Role', 'Total Sales', 'Transactions'],
        rows: rows.map(flattenRow),
      };
    }
    case 'payment-methods': {
      const r = await reportService.paymentMethodsReport(shopId, from, to);
      const map = (r.data as Record<string, number>) || {};
      return {
        title: 'Payment Methods Report',
        columns: ['Method', 'Amount'],
        rows: Object.entries(map).map(([method, amount]) => ({ Method: method, Amount: asNumber(amount) })),
      };
    }
    case 'products': {
      const products = await prisma.product.findMany({
        where: { shopId, isActive: true },
        include: { category: { select: { name: true } } },
        orderBy: { name: 'asc' },
      });
      return {
        title: 'Products Report',
        columns: ['Name', 'SKU', 'Barcode', 'Category', 'Brand', 'Cost Price', 'Selling Price', 'Stock'],
        rows: products.map((p) => ({
          Name: p.name ?? '',
          SKU: p.sku ?? '',
          Barcode: p.barcode ?? '',
          Category: p.category?.name ?? '',
          Brand: p.brand ?? '',
          'Cost Price': asNumber(p.costPrice),
          'Selling Price': asNumber(p.sellingPrice),
          Stock: asNumber(p.stockQuantity),
        })),
      };
    }
    case 'suppliers': {
      const suppliers = await prisma.supplier.findMany({
        where: { shopId, deletedAt: null },
        orderBy: { name: 'asc' },
      });
      return {
        title: 'Suppliers Report',
        columns: ['Name', 'Phone', 'Email', 'Address'],
        rows: suppliers.map((s) => ({
          Name: s.name ?? '',
          Phone: s.phone ?? '',
          Email: s.email ?? '',
          Address: s.address ?? '',
        })),
      };
    }
    case 'customers': {
      const customers = await prisma.customer.findMany({
        where: { shopId, isArchived: false },
        orderBy: { name: 'asc' },
      });
      return {
        title: 'Customers Report',
        columns: ['Name', 'Phone', 'Email', 'Address', 'Outstanding Balance', 'Credit Limit'],
        rows: customers.map((c) => ({
          Name: c.name ?? '',
          Phone: c.phone ?? '',
          Email: c.email ?? '',
          Address: c.address ?? '',
          'Outstanding Balance': asNumber(c.outstandingBalance),
          'Credit Limit': asNumber(c.creditLimit),
        })),
      };
    }
    case 'valuation': {
      const v = await analyticsService.valuation(shopId);
      return {
        title: 'Business Valuation Report',
        columns: ['Category', 'Item', 'Amount'],
        rows: [
          ...v.assets.map((a) => ({ Category: 'Asset', Item: a.label, Amount: asNumber(a.amount) })),
          ...v.liabilities.map((l) => ({ Category: 'Liability', Item: l.label, Amount: asNumber(l.amount) })),
          { Category: 'Net Value', Item: 'Net Business Value', Amount: asNumber(v.summary.net) },
        ],
      };
    }
    default:
      return { title: '', columns: [], rows: [] };
  }
}

function toCsvBuffer(report: FlatReport): Buffer {
  const header = report.columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(',');
  const body = report.rows.map((row) =>
    report.columns.map((c) => {
      const val = row[c];
      const s = val === null || val === undefined ? '' : String(val);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')
  );
  return Buffer.from([header, ...body].join('\n'), 'utf-8');
}

async function toXlsxBuffer(report: FlatReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report');
  sheet.columns = report.columns.map((c) => ({ header: c, key: c, width: Math.max(c.length + 4, 16) }));
  for (const row of report.rows) {
    sheet.addRow(report.columns.reduce((acc, c) => ({ ...acc, [c]: row[c] }), {}));
  }
  sheet.getRow(1).font = { bold: true };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function toPdfBuffer(report: FlatReport): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(16).text(report.title, { align: 'center' });
  doc.moveDown();

  drawBarChart(doc, report);

  if (report.rows.length === 0) {
    doc.fontSize(12).text('No data available for the selected period.', { align: 'center' });
  } else {
    const colWidths = report.columns.map((c) => {
      const max = Math.max(c.length, ...report.rows.slice(0, 50).map((r) => String(r[c] ?? '').length));
      return Math.min(Math.max(max * 6 + 12, 70), 200);
    });
    const rowHeight = 22;

    const drawHeader = () => {
      let x = doc.page.margins.left;
      report.columns.forEach((c, i) => {
        doc.rect(x, doc.y, colWidths[i], rowHeight).fill('#0A1E3F');
        doc.fillColor('white').fontSize(9).text(c, x + 4, doc.y + 7, { width: colWidths[i] - 8, ellipsis: true });
        x += colWidths[i];
      });
      doc.y += rowHeight;
    };

    const drawRow = (row: Record<string, unknown>) => {
      let x = doc.page.margins.left;
      doc.fillColor('black');
      report.columns.forEach((c, i) => {
        doc.rect(x, doc.y, colWidths[i], rowHeight).stroke('#E2E8F0');
        doc.fontSize(8).text(String(row[c] ?? ''), x + 4, doc.y + 7, { width: colWidths[i] - 8, ellipsis: true });
        x += colWidths[i];
      });
      doc.y += rowHeight;
    };

    drawHeader();
    for (const row of report.rows) {
      if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        drawHeader();
      }
      drawRow(row);
    }
  }

  doc.end();
  return done;
}

/**
 * Draws a simple horizontal bar chart for the report when it contains a numeric
 * column. Uses the first column as the label and the first numeric column as the
 * value. Only the top 8 rows (by value) are plotted.
 */
function drawBarChart(doc: PDFKit.PDFDocument, report: FlatReport): void {
  const rows = report.rows ?? [];
  if (rows.length === 0) return;

  const numericCol = report.columns.find((c) => typeof rows[0][c] === 'number');
  if (!numericCol) return;
  const labelCol = report.columns[0];

  const items = rows
    .filter((r) => typeof r[numericCol] === 'number')
    .map((r) => ({ label: String(r[labelCol] ?? ''), value: Number(r[numericCol]) }))
    .filter((i) => i.label && isFinite(i.value))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  if (items.length === 0) return;

  const maxValue = Math.max(...items.map((i) => Math.abs(i.value)), 1);
  const chartWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const labelWidth = 180;
  const barAreaWidth = chartWidth - labelWidth - 90;
  const barHeight = 20;
  const gap = 6;
  const startY = doc.y;

  items.forEach((item, i) => {
    if (startY + (i + 1) * (barHeight + gap) > doc.page.height - 60) return;

    const y = startY + i * (barHeight + gap);
    doc.fillColor('#1A2A3A').fontSize(8).text(item.label.slice(0, 26), doc.page.margins.left, y + 4, { width: labelWidth - 8, ellipsis: true });

    const w = Math.max(4, (Math.abs(item.value) / maxValue) * barAreaWidth);
    doc.rect(doc.page.margins.left + labelWidth, y, w, barHeight).fill(item.value >= 0 ? '#00897b' : '#E74C3C');
    doc.fillColor('#1A2A3A').fontSize(8).text(String(item.value), doc.page.margins.left + labelWidth + w + 6, y + 5);
  });

  doc.y = startY + items.length * (barHeight + gap) + 12;
  doc.moveDown();
}

export class ReportExportService {
  async export(params: {
    shopId: string;
    type: string;
    format: string;
    from?: string;
    to?: string;
  }): Promise<ExportResult | null> {
    if (!isReportType(params.type) || !isExportFormat(params.format)) {
      return null;
    }

    const report = await buildReport(params.shopId, params.type, params.from, params.to);
    const safeName = `${params.type}-${new Date().toISOString().slice(0, 10)}`;

    switch (params.format) {
      case 'csv':
        return {
          buffer: toCsvBuffer(report),
          contentType: 'text/csv; charset=utf-8',
          filename: `${safeName}.csv`,
        };
      case 'xlsx':
        return {
          buffer: await toXlsxBuffer(report),
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          filename: `${safeName}.xlsx`,
        };
      case 'pdf':
        return {
          buffer: await toPdfBuffer(report),
          contentType: 'application/pdf',
          filename: `${safeName}.pdf`,
        };
      default:
        return null;
    }
  }
}

export const reportExportService = new ReportExportService();
