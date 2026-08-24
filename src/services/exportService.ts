import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import XLSX from 'xlsx-js-style';
import { Share, Alert } from 'react-native';
import { Expense, AppSettings } from '../types/expense';
import { formatTime } from '../utils/formatters';

export type ExportFormat = 'xlsx' | 'pdf' | 'json';

/**
 * Format date as DD/MM/YYYY (e.g. 24/08/2026)
 */
function formatDateDDMMYYYY(dateString: string): string {
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Generate human-readable date stamp for filename (e.g. 24-Aug-2026)
 */
function getFilenameDateStamp(): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  return `${day}-${month}-${year}`;
}

export async function exportExpenses(
  format: ExportFormat,
  expenses: Expense[],
  settings: AppSettings
): Promise<void> {
  // Empty data validation
  if (!expenses || expenses.length === 0) {
    Alert.alert(
      'No expenses to export',
      'Add at least one expense before exporting your report.'
    );
    return;
  }

  const dateStamp = getFilenameDateStamp();

  switch (format) {
    case 'xlsx':
      await exportAsXlsx(expenses, settings, dateStamp);
      break;
    case 'pdf':
      await exportAsPdf(expenses, settings, dateStamp);
      break;
    case 'json':
      await exportAsJson(expenses, settings, dateStamp);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

// ──────────────── 1. EXCEL (.xlsx) WITH STYLED HEADER, BORDERS & TOTAL ROW ────────────────
async function exportAsXlsx(
  expenses: Expense[],
  settings: AppSettings,
  dateStamp: string
): Promise<void> {
  const wb = XLSX.utils.book_new();

  // Column Headers
  const headers = ['Date', 'Time', 'Expense Name', 'Category', 'Amount', 'Currency', 'Notes'];

  // Construct Data Rows
  const dataRows: (string | number)[][] = [];

  for (const exp of expenses) {
    const formattedDate = formatDateDDMMYYYY(exp.createdAt);
    const formattedTime = formatTime(exp.createdAt);
    const notesValue = exp.notes && exp.notes.trim() ? exp.notes.trim() : '--';
    const currencyCode = settings.currencyCode || 'INR';

    dataRows.push([
      formattedDate,
      formattedTime,
      exp.name || 'Expense',
      exp.category || 'Other',
      Number(exp.amount.toFixed(2)),
      currencyCode,
      notesValue,
    ]);
  }

  // Handle Total Rows (Safe currency grouping)
  const currencyGroups: Record<string, { total: number; count: number }> = {};
  for (const exp of expenses) {
    const code = settings.currencyCode || 'INR';
    if (!currencyGroups[code]) {
      currencyGroups[code] = { total: 0, count: 0 };
    }
    currencyGroups[code].total += exp.amount;
    currencyGroups[code].count += 1;
  }

  const totalRows: (string | number)[][] = [];
  const groupKeys = Object.keys(currencyGroups);

  for (const code of groupKeys) {
    const group = currencyGroups[code];
    const txLabel = group.count === 1 ? '1 transaction' : `${group.count} transactions`;
    totalRows.push([
      'TOTAL',
      '',
      '',
      '',
      Number(group.total.toFixed(2)),
      code,
      txLabel,
    ]);
  }

  // Build Sheet Data Array
  const wsData = [headers, ...dataRows, ...totalRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set Column Widths
  ws['!cols'] = [
    { wch: 14 }, // Date
    { wch: 12 }, // Time
    { wch: 28 }, // Expense Name
    { wch: 18 }, // Category
    { wch: 14 }, // Amount
    { wch: 12 }, // Currency
    { wch: 28 }, // Notes
  ];

  // Set Row Heights
  ws['!rows'] = [
    { hpt: 26 }, // Header row height
    ...dataRows.map(() => ({ hpt: 20 })),
    ...totalRows.map(() => ({ hpt: 22 })),
  ];

  // Freeze First (Header) Row
  ws['!views'] = [{ state: 'frozen', ySplit: 1, activeCell: 'A2' }];

  // ──────────────── CELL STYLES ────────────────
  const headerFill = { fgColor: { rgb: 'D9E1F2' } }; // Soft light blue
  const headerFont = { name: 'Arial', sz: 11, bold: true, color: { rgb: '1E293B' } };
  const headerBorder = {
    top: { style: 'thin', color: { rgb: 'B0C4DE' } },
    bottom: { style: 'medium', color: { rgb: '8FAADC' } },
    left: { style: 'thin', color: { rgb: 'B0C4DE' } },
    right: { style: 'thin', color: { rgb: 'B0C4DE' } },
  };

  const dataFont = { name: 'Arial', sz: 10, color: { rgb: '171717' } };
  const dataBorder = {
    top: { style: 'thin', color: { rgb: 'E2E8F0' } },
    bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
    left: { style: 'thin', color: { rgb: 'E2E8F0' } },
    right: { style: 'thin', color: { rgb: 'E2E8F0' } },
  };

  const totalFill = { fgColor: { rgb: 'E2EFDA' } }; // Subtle soft green
  const totalFont = { name: 'Arial', sz: 11, bold: true, color: { rgb: '14532D' } };
  const totalBorder = {
    top: { style: 'medium', color: { rgb: 'A9D08E' } },
    bottom: { style: 'medium', color: { rgb: 'A9D08E' } },
    left: { style: 'thin', color: { rgb: 'C6E0B4' } },
    right: { style: 'thin', color: { rgb: 'C6E0B4' } },
  };

  const totalRowStartIndex = 1 + dataRows.length;

  // Apply Styles to All Cells
  for (let r = 0; r < wsData.length; r++) {
    const isHeader = r === 0;
    const isTotal = r >= totalRowStartIndex;

    for (let c = 0; c < headers.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) {
        ws[cellRef] = { t: 's', v: '' };
      }

      const cell = ws[cellRef];

      // Determine Alignment
      let horizontalAlign: 'left' | 'center' | 'right' = 'center';
      if (c === 2 || c === 6) {
        // Expense Name & Notes: Left
        horizontalAlign = 'left';
      } else if (c === 4) {
        // Amount: Right
        horizontalAlign = 'right';
      } else {
        // Date, Time, Category, Currency: Center
        horizontalAlign = 'center';
      }

      if (isHeader) {
        cell.s = {
          fill: headerFill,
          font: headerFont,
          alignment: { horizontal: 'center', vertical: 'center' },
          border: headerBorder,
        };
      } else if (isTotal) {
        cell.s = {
          fill: totalFill,
          font: totalFont,
          alignment: { horizontal: horizontalAlign, vertical: 'center' },
          border: totalBorder,
        };
        if (c === 4 && typeof cell.v === 'number') {
          cell.z = '#,##0.00';
        }
      } else {
        cell.s = {
          fill: { fgColor: { rgb: r % 2 === 0 ? 'F8FAFC' : 'FFFFFF' } },
          font: dataFont,
          alignment: { horizontal: horizontalAlign, vertical: 'center' },
          border: dataBorder,
        };
        if (c === 4 && typeof cell.v === 'number') {
          cell.z = '#,##0.00';
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Mova Expense Report');

  const base64Content = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const filename = `Mova-Expense-Report-${dateStamp}.xlsx`;
  const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  const fileUri = `${baseDir}${filename}`;

  try {
    await FileSystem.writeAsStringAsync(fileUri, base64Content, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export Expense Report as Excel',
        UTI: 'org.openxmlformats.spreadsheetml.sheet',
      });
    } else {
      await Share.share({
        title: filename,
        url: fileUri,
      });
    }
  } catch (err) {
    console.error('Excel export error:', err);
    throw err;
  }
}

// ──────────────── 2. PDF EXPORT (BASE64 DIRECT RENDER) ────────────────
async function exportAsPdf(
  expenses: Expense[],
  settings: AppSettings,
  dateStamp: string
): Promise<void> {
  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = expenses.length;
  const avgExpense = totalExpenses > 0 ? totalSpent / totalExpenses : 0;
  const currencySymbol = settings.currency || '₹';

  const dateOptions: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
  const sortedDates = expenses
    .map((e) => new Date(e.createdAt).getTime())
    .sort((a, b) => a - b);
  const minDate = new Date(sortedDates[0]);
  const maxDate = new Date(sortedDates[sortedDates.length - 1]);
  const dateRangeStr = `${minDate.toLocaleDateString('en-US', dateOptions)} – ${maxDate.toLocaleDateString('en-US', dateOptions)}`;

  const categoryTotals: Record<string, number> = {};
  for (const exp of expenses) {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  }

  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  const categorySummaryHtml = categoryEntries
    .map(([cat, amt]) => {
      const pct = totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(1) : '0';
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 7px 12px; border-bottom: 1px solid #e7e7e4; font-size: 13px;">
          <span style="font-weight: 600; color: #171717;">${cat}</span>
          <span style="font-weight: 600; color: #171717;">
            ${currencySymbol}${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            <span style="color: #737373; font-size: 11px; font-weight: 400; margin-left: 6px;">(${pct}%)</span>
          </span>
        </div>
      `;
    })
    .join('');

  const rowsHtml = expenses
    .map((exp, idx) => {
      const formattedDate = formatDateDDMMYYYY(exp.createdAt);

      return `
        <tr style="border-bottom: 1px solid #e7e7e4; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9f9f8'};">
          <td style="padding: 10px 12px; font-size: 12px; color: #525252; text-align: center; border-right: 1px solid #e7e7e4;">${formattedDate}</td>
          <td style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #171717; text-align: left; border-right: 1px solid #e7e7e4;">${exp.name}</td>
          <td style="padding: 10px 12px; font-size: 12px; font-weight: 500; color: #525252; text-align: center; border-right: 1px solid #e7e7e4;">${exp.category}</td>
          <td style="padding: 10px 14px; font-size: 13px; font-weight: 700; color: #171717; text-align: right;">${currencySymbol}${exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Expense Report</title>
        <style>
          @page { margin: 20px; size: A4 portrait; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #171717;
            margin: 0;
            padding: 24px;
            background-color: #ffffff;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 18px;
            border-bottom: 2px solid #171717;
            margin-bottom: 20px;
          }
          .brand-pre {
            font-size: 11px;
            font-weight: 700;
            color: #737373;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 3px;
          }
          .brand-title {
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.5px;
            margin: 0 0 4px 0;
          }
          .date-range {
            font-size: 12px;
            color: #737373;
            margin: 0;
          }
          .meta-box {
            text-align: right;
            font-size: 12px;
            color: #525252;
            line-height: 18px;
          }
          .cards-grid {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
          }
          .stat-card {
            flex: 1;
            background-color: #fafaf9;
            border: 1px solid #e7e7e4;
            border-radius: 10px;
            padding: 12px 14px;
            text-align: center;
          }
          .stat-label {
            font-size: 10px;
            font-weight: 700;
            color: #737373;
            letter-spacing: 0.6px;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .stat-val {
            font-size: 20px;
            font-weight: 700;
            color: #171717;
          }
          .section-title {
            font-size: 13px;
            font-weight: 700;
            color: #171717;
            letter-spacing: 0.4px;
            text-transform: uppercase;
            margin: 20px 0 8px 0;
          }
          .category-box {
            background-color: #ffffff;
            border: 1px solid #e7e7e4;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 22px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            border: 1px solid #e7e7e4;
            border-radius: 10px;
            overflow: hidden;
          }
          th {
            background-color: #171717;
            color: #ffffff;
            padding: 10px 12px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            text-align: center;
            border-right: 1px solid #333333;
          }
          th:last-child {
            border-right: none;
          }
          th.left, td.left {
            text-align: left;
          }
          th.right, td.right {
            text-align: right;
          }
          .total-row {
            background-color: #fafaf9;
            border-top: 2px solid #171717;
          }
          .total-row td {
            padding: 12px 14px;
            font-size: 13px;
            font-weight: 700;
            color: #171717;
          }
          .footer {
            margin-top: 30px;
            padding-top: 14px;
            border-top: 1px solid #e7e7e4;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #a3a3a3;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="brand-pre">Mova</div>
            <h1 class="brand-title">Expense Report</h1>
            <p class="date-range">Date range: ${dateRangeStr}</p>
          </div>
          <div class="meta-box">
            <div><strong>Generated:</strong> ${dateStamp}</div>
            <div><strong>Currency:</strong> ${settings.currencyCode} (${currencySymbol})</div>
          </div>
        </div>

        <div class="cards-grid">
          <div class="stat-card">
            <div class="stat-label">Total Spent</div>
            <div class="stat-val">${currencySymbol}${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Expenses</div>
            <div class="stat-val">${totalExpenses}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Average Expense</div>
            <div class="stat-val">${currencySymbol}${avgExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div class="section-title">Category Summary</div>
        <div class="category-box">
          ${categorySummaryHtml}
        </div>

        <div class="section-title">Expense List (${totalExpenses})</div>
        <table>
          <thead>
            <tr>
              <th style="width: 24%;">Date</th>
              <th class="left" style="width: 38%;">Expense</th>
              <th style="width: 18%;">Category</th>
              <th class="right" style="width: 20%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="total-row">
              <td colspan="3" style="text-align: right; padding-right: 14px; font-weight: 700; text-transform: uppercase;">Total Spent</td>
              <td class="right" style="font-weight: 700; color: #171717;">${currencySymbol}${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <div>Generated by Mova — 100% On-Device Local Finance</div>
          <div>All amounts in ${settings.currencyCode}</div>
        </div>
      </body>
    </html>
  `;

  try {
    const printResult = await Print.printToFileAsync({
      html,
      base64: true,
    });

    const filename = `Mova-Expense-Report-${dateStamp}.pdf`;
    const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    const targetUri = `${baseDir}${filename}`;

    if (printResult.base64) {
      await FileSystem.writeAsStringAsync(targetUri, printResult.base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export Expense Report as PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        await Share.share({
          title: filename,
          url: targetUri,
        });
      }
    } else if (printResult.uri) {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(printResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export Expense Report as PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        await Share.share({
          title: filename,
          url: printResult.uri,
        });
      }
    } else {
      throw new Error('ExpoPrint did not return a valid PDF result.');
    }
  } catch (err) {
    console.error('PDF export error:', err);
    throw err;
  }
}

// ──────────────── 3. JSON EXPORT ────────────────
async function exportAsJson(
  expenses: Expense[],
  settings: AppSettings,
  dateStamp: string
): Promise<void> {
  const totalAmount = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  const payload = {
    appName: 'Mova',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    user: settings.userName || 'User',
    currency: {
      code: settings.currencyCode,
      symbol: settings.currency,
    },
    summary: {
      totalRecords: expenses.length,
      totalSpent: totalAmount,
    },
    expenses: expenses.map((exp) => ({
      name: exp.name,
      amount: exp.amount,
      category: exp.category,
      date: formatDateDDMMYYYY(exp.createdAt),
      time: formatTime(exp.createdAt),
      notes: exp.notes && exp.notes.trim() ? exp.notes.trim() : '--',
    })),
  };

  const jsonContent = JSON.stringify(payload, null, 2);
  const filename = `Mova-Expense-Report-${dateStamp}.json`;
  const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  const fileUri = `${baseDir}${filename}`;

  try {
    await FileSystem.writeAsStringAsync(fileUri, jsonContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Expenses as JSON',
        UTI: 'public.json',
      });
    } else {
      await Share.share({
        title: filename,
        message: jsonContent,
      });
    }
  } catch (err) {
    console.error('JSON export error:', err);
    await Share.share({
      title: filename,
      message: jsonContent,
    });
  }
}
