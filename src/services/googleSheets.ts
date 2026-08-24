import { ExpenseItem, GoogleSheetConfig } from '../types/expense';

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// -------------------------------------------------------------
// SHAKE EXPENSE TRACKER - GOOGLE APPS SCRIPT WEB APP
// -------------------------------------------------------------
// HOW TO SET UP:
// 1. Open Google Sheets (https://sheets.new)
// 2. Click on "Extensions" -> "Apps Script"
// 3. Paste this entire code replacing existing code
// 4. Click "Deploy" -> "New deployment"
// 5. Select type: "Web app"
// 6. Execute as: "Me"
// 7. Who has access: "Anyone" (Critical so your mobile app can save)
// 8. Click "Deploy" and Copy the "Web app URL"
// 9. Paste that Web app URL in your Shake Expense Tracker Mobile App!
// -------------------------------------------------------------

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var sheet = getOrCreateExpenseSheet();
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action || 'addExpense';
    
    if (action === 'addExpense') {
      var item = postData.data;
      var formattedDate = item.date ? new Date(item.date).toLocaleDateString() : new Date().toLocaleDateString();
      var formattedTime = item.date ? new Date(item.date).toLocaleTimeString() : new Date().toLocaleTimeString();
      
      sheet.appendRow([
        item.id || Utilities.getUuid(),
        formattedDate,
        formattedTime,
        item.remark || 'Expense',
        Number(item.amount) || 0,
        item.category || 'Other',
        item.paymentMethod || 'Cash',
        new Date().toISOString()
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Expense recorded successfully!',
        id: item.id
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'batchAdd') {
      var items = postData.data || [];
      var rows = items.map(function(item) {
        return [
          item.id || Utilities.getUuid(),
          new Date(item.date).toLocaleDateString(),
          new Date(item.date).toLocaleTimeString(),
          item.remark || 'Expense',
          Number(item.amount) || 0,
          item.category || 'Other',
          item.paymentMethod || 'Cash',
          new Date().toISOString()
        ];
      });
      
      if (rows.length > 0) {
        var startRow = sheet.getLastRow() + 1;
        sheet.getRange(startRow, 1, rows.length, 8).setValues(rows);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: rows.length + ' expenses synced successfully!'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Unknown action'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var sheet = getOrCreateExpenseSheet();
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        data: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var headers = data[0];
    var expenses = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0] && !row[3]) continue;
      
      expenses.push({
        id: String(row[0] || 'row-' + i),
        date: row[1] ? new Date(row[1]).toISOString() : new Date().toISOString(),
        remark: String(row[3] || 'Expense'),
        amount: Number(row[4]) || 0,
        category: String(row[5] || 'Other'),
        paymentMethod: String(row[6] || 'Cash'),
        timestamp: row[7] ? new Date(row[7]).getTime() : Date.now(),
        syncedToSheet: true,
        sheetRowIndex: i + 1
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: expenses
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateExpenseSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('ShakeExpenses');
  
  if (!sheet) {
    sheet = ss.insertSheet('ShakeExpenses');
    var headerRow = ['ID', 'Date', 'Time', 'Remark', 'Amount', 'Category', 'Payment Method', 'Synced At'];
    sheet.appendRow(headerRow);
    
    // Style headers
    var headerRange = sheet.getRange(1, 1, 1, 8);
    headerRange.setBackground('#059669');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    // Format Amount column as currency
    sheet.getRange('E2:E').setNumberFormat('#,##0.00');
  }
  return sheet;
}
`;

export class GoogleSheetsService {
  /**
   * Save a single expense to Google Sheet
   */
  static async saveExpenseToSheet(expense: ExpenseItem, config: GoogleSheetConfig): Promise<{ success: boolean; message: string }> {
    if (!config.webAppUrl || !config.webAppUrl.trim()) {
      return { success: false, message: 'Google Sheet Web App URL not configured.' };
    }

    try {
      const response = await fetch(config.webAppUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Using text/plain avoids CORS preflight redirects on Google Apps Script
        },
        body: JSON.stringify({
          action: 'addExpense',
          data: expense,
        }),
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        // If Google Apps Script returned a redirect or standard response
        return { success: response.ok, message: response.ok ? 'Saved to Google Sheet' : 'Saved locally, server responded with status ' + response.status };
      }

      if (result && result.status === 'success') {
        return { success: true, message: result.message || 'Saved to Google Sheet' };
      } else {
        return { success: false, message: result?.message || 'Failed to save to Google Sheet' };
      }
    } catch (error: any) {
      console.warn('Google Sheet Save Error:', error);
      return { success: false, message: error?.message || 'Network error saving to Google Sheet' };
    }
  }

  /**
   * Batch sync multiple pending expenses to Google Sheet
   */
  static async batchSyncExpenses(expenses: ExpenseItem[], config: GoogleSheetConfig): Promise<{ success: boolean; syncedCount: number; message: string }> {
    if (!config.webAppUrl || !config.webAppUrl.trim()) {
      return { success: false, syncedCount: 0, message: 'Google Sheet URL not configured' };
    }

    if (expenses.length === 0) {
      return { success: true, syncedCount: 0, message: 'No expenses to sync' };
    }

    try {
      const response = await fetch(config.webAppUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'batchAdd',
          data: expenses,
        }),
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        return { success: response.ok, syncedCount: response.ok ? expenses.length : 0, message: response.ok ? 'Batch synced' : 'Sync error' };
      }

      return {
        success: result.status === 'success',
        syncedCount: result.status === 'success' ? expenses.length : 0,
        message: result.message || 'Sync completed',
      };
    } catch (error: any) {
      return { success: false, syncedCount: 0, message: error?.message || 'Network error during batch sync' };
    }
  }

  /**
   * Fetch all expenses recorded in Google Sheet
   */
  static async fetchExpensesFromSheet(config: GoogleSheetConfig): Promise<{ success: boolean; data?: ExpenseItem[]; message: string }> {
    if (!config.webAppUrl || !config.webAppUrl.trim()) {
      return { success: false, message: 'Google Sheet Web App URL not configured' };
    }

    try {
      const url = config.webAppUrl.includes('?') 
        ? `${config.webAppUrl}&action=getExpenses` 
        : `${config.webAppUrl}?action=getExpenses`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        return { success: false, message: 'Unexpected response from Google Sheet Web App' };
      }

      if (result && result.status === 'success' && Array.isArray(result.data)) {
        return { success: true, data: result.data, message: `Fetched ${result.data.length} expenses from Google Sheet` };
      } else {
        return { success: false, message: result?.message || 'Failed to parse sheet data' };
      }
    } catch (error: any) {
      return { success: false, message: error?.message || 'Network error fetching from Google Sheet' };
    }
  }

  /**
   * Test connection to the Google Apps Script Web App
   */
  static async testConnection(webAppUrl: string): Promise<{ success: boolean; message: string }> {
    if (!webAppUrl || !webAppUrl.trim()) {
      return { success: false, message: 'Please enter a valid Web App URL' };
    }

    try {
      const url = webAppUrl.includes('?') ? `${webAppUrl}&action=getExpenses` : `${webAppUrl}?action=getExpenses`;
      const response = await fetch(url, { method: 'GET' });
      
      if (response.ok) {
        return { success: true, message: 'Connected successfully to Google Sheet!' };
      } else {
        return { success: false, message: `Server returned HTTP ${response.status}` };
      }
    } catch (error: any) {
      return { success: false, message: error?.message || 'Could not connect to Google Sheet. Check the URL and deployment settings.' };
    }
  }
}
