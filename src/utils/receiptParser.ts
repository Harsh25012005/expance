import { CategoryType } from '../types/expense';

export interface ParsedReceiptData {
  merchant: string;
  amount: number;
  category: CategoryType;
  date: string;
  tax?: number;
  rawText?: string;
  confidence: number;
}

const CATEGORY_KEYWORDS: Record<CategoryType, string[]> = {
  Food: [
    'coffee', 'cafe', 'restaurant', 'burger', 'pizza', 'bakery', 'grill',
    'kitchen', 'grocery', 'market', 'dinner', 'lunch', 'breakfast', 'snack',
    'starbucks', 'mcdonald', 'subway', 'dominos', 'kfc', 'diner', 'bistro',
    'bar', 'pub', 'supermarket', 'whole foods', 'trader joe', 'food', 'mart',
    'espresso', 'tea', 'bakery', 'pastry', 'donut', 'taco', 'sushi', 'noodle',
    'ice cream', 'chilis', 'chipotle', 'wendys', 'panera'
  ],
  Transport: [
    'uber', 'lyft', 'taxi', 'fuel', 'petrol', 'diesel', 'gas', 'gasoline',
    'shell', 'bp', 'chevron', 'exxon', 'parking', 'transit', 'metro', 'cab',
    'oil', 'toll', 'train', 'rail', 'subway', 'auto', 'ride', 'garage', 'mechanic'
  ],
  Shopping: [
    'apparel', 'clothing', 'store', 'target', 'walmart', 'amazon', 'zara',
    'h&m', 'shoes', 'electronics', 'apple', 'nike', 'adidas', 'mall', 'fashion',
    'retail', 'outlet', 'best buy', 'costco', 'ikea', 'boutique', 'goods'
  ],
  Bills: [
    'utility', 'electric', 'electricity', 'water', 'internet', 'telecom',
    'broadband', 'verizon', 'at&t', 't-mobile', 'vodafone', 'power', 'subscription',
    'bill', 'insurance', 'recharge', 'mobile', 'wifi', 'cable', 'energy'
  ],
  Health: [
    'pharmacy', 'medical', 'clinic', 'hospital', 'doctor', 'cvs', 'walgreens',
    'health', 'drug', 'dental', 'dentist', 'chemist', 'optometry', 'medicine',
    'apollo', 'care', 'prescription', 'pharma', 'therapy', 'wellness'
  ],
  Travel: [
    'hotel', 'motel', 'flight', 'airline', 'airbnb', 'booking', 'resort',
    'airport', 'marriott', 'hilton', 'holiday inn', 'stay', 'vacation',
    'delta', 'united', 'emirates', 'indigo', 'expedia', 'hostel'
  ],
  Education: [
    'book', 'books', 'university', 'school', 'college', 'tuition', 'academy',
    'course', 'udemy', 'coursera', 'library', 'learning', 'stationery', 'exam'
  ],
  Entertainment: [
    'cinema', 'theater', 'theatre', 'movie', 'amc', 'regal', 'pvr', 'imax',
    'concert', 'ticket', 'club', 'bowling', 'arcade', 'game', 'netflix', 'spotify'
  ],
  Other: [],
};

const JUNK_HEADER_WORDS = [
  'tax invoice', 'invoice', 'receipt', 'welcome', 'thank you', 'thanks',
  'order #', 'order no', 'reg no', 'vat #', 'gst #', 'gstin', 'cashier',
  'terminal', 'store #', 'copy', 'merchant copy', 'customer copy', 'original',
  'duplicate', 'cash receipt', 'sales draft', 'tel:', 'phone:', 'fax:',
  'date:', 'time:', 'table #', 'server:', 'check #', 'pos', 'trans #',
];

/**
 * Intelligent on-device receipt parser for raw OCR text
 */
export function parseReceiptText(rawText: string): ParsedReceiptData {
  if (!rawText || !rawText.trim()) {
    return {
      merchant: 'Scanned Receipt',
      amount: 0,
      category: 'Shopping',
      date: new Date().toISOString(),
      confidence: 0,
    };
  }

  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const fullTextLower = rawText.toLowerCase();

  // ── 1. Extract Merchant Name ──
  let merchant = '';
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Skip short lines, address numbers, or junk lines
    if (line.length < 3 || /^\d+$/.test(line) || /^\d{1,5}\s+[a-z]/i.test(line)) {
      continue;
    }

    const isJunk = JUNK_HEADER_WORDS.some((word) => lower.includes(word));
    if (!isJunk && !merchant) {
      // Clean merchant string
      merchant = line
        .replace(/[^a-zA-Z0-9\s&'-]/g, '')
        .trim();
      break;
    }
  }

  if (!merchant && lines.length > 0) {
    merchant = lines[0].replace(/[^a-zA-Z0-9\s&'-]/g, '').trim();
  }

  if (!merchant || merchant.length < 2) {
    merchant = 'Scanned Receipt';
  }

  // ── 2. Extract Total Amount ──
  // Look for lines containing "TOTAL", "AMOUNT", "BALANCE", "NET", "PAID"
  let extractedAmount = 0;
  let highestAmount = 0;
  let foundTotalLine = false;

  const numberRegex = /(?:[\$€£₹]\s*)?([0-9]{1,6}(?:[,.][0-9]{2,3})*(?:\.[0-9]{2}))\b/g;

  // Pass 1: Look for explicit Total lines
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const lower = line.toLowerCase();

    const isTotalKeyword =
      lower.includes('total') ||
      lower.includes('grand total') ||
      lower.includes('net amount') ||
      lower.includes('amount due') ||
      lower.includes('balance due') ||
      lower.includes('payment') ||
      lower.includes('paid');

    const isSubtotalOrTax =
      lower.includes('subtotal') ||
      lower.includes('sub total') ||
      lower.includes('tax') ||
      lower.includes('change');

    // Extract numbers from this line
    const matches = Array.from(line.matchAll(numberRegex));
    for (const match of matches) {
      const numStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(numStr);

      if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
        if (isTotalKeyword && !isSubtotalOrTax) {
          extractedAmount = parsed;
          foundTotalLine = true;
          break;
        }
        if (parsed > highestAmount && parsed < 50000) {
          highestAmount = parsed;
        }
      }
    }

    if (foundTotalLine) break;
  }

  // Fallback to highest detected price if explicit Total keyword wasn't tagged
  const finalAmount = extractedAmount > 0 ? extractedAmount : highestAmount;

  // ── 3. Extract Category ──
  let detectedCategory: CategoryType = 'Shopping';
  let maxMatches = 0;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [CategoryType, string[]][]) {
    let count = 0;
    for (const kw of keywords) {
      if (fullTextLower.includes(kw)) {
        count += kw.length > 5 ? 2 : 1; // Give longer/specific matches higher weight
      }
    }
    if (count > maxMatches) {
      maxMatches = count;
      detectedCategory = cat;
    }
  }

  // ── 4. Extract Date ──
  let extractedDate = new Date().toISOString();
  // Match formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD Mon YYYY
  const dateRegex = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/;
  const dateMatch = rawText.match(dateRegex);

  if (dateMatch) {
    const rawDateStr = dateMatch[1].replace(/-/g, '/');
    const parsedDate = new Date(rawDateStr);
    if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() >= 2000 && parsedDate.getFullYear() <= 2030) {
      extractedDate = parsedDate.toISOString();
    }
  }

  // ── 5. Extract Tax (Optional) ──
  let extractedTax: number | undefined = undefined;
  const taxRegex = /(?:tax|gst|vat)\s*(?:[\$€£₹]\s*)?([0-9]+(?:\.[0-9]{2})?)/i;
  const taxMatch = rawText.match(taxRegex);
  if (taxMatch) {
    const t = parseFloat(taxMatch[1]);
    if (!isNaN(t) && t > 0 && t < finalAmount) {
      extractedTax = t;
    }
  }

  return {
    merchant,
    amount: finalAmount,
    category: detectedCategory,
    date: extractedDate,
    tax: extractedTax,
    rawText,
    confidence: finalAmount > 0 ? 0.95 : 0.4,
  };
}
