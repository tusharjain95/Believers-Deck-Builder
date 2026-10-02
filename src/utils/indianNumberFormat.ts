/**
 * Indian Number Formatting and Parsing Utilities
 * Supports:
 * - Shorthand inputs: "7.34L", "7.34 lakh", "1.2 Cr", "7,34,492", "50k"
 * - Indian grouping: 60,56,52,845 (last 3 digits, then groups of 2)
 * - INR formats: inr, inr_lakh, inr_cr, pct
 */

/**
 * Parses user input into a numeric value, supporting Indian notation
 */
export function parseIndianNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    return isNaN(val) ? null : val;
  }

  const str = String(val).trim().toLowerCase();
  if (str === '') return null;

  // Crore: 1.2 cr, 1.2cr, 1.2 crore
  const crMatch = str.match(/^([+-]?\d+(?:\.\d+)?)\s*(?:cr|crore|crores)$/);
  if (crMatch) {
    const n = parseFloat(crMatch[1]);
    return isNaN(n) ? null : Math.round(n * 10000000);
  }

  // Lakh: 7.34 l, 7.34l, 7.34 lakh, 7.34 lac
  const lakhMatch = str.match(/^([+-]?\d+(?:\.\d+)?)\s*(?:l|lakh|lakhs|lac|lacs)$/);
  if (lakhMatch) {
    const n = parseFloat(lakhMatch[1]);
    return isNaN(n) ? null : Math.round(n * 100000);
  }

  // Thousand: 50k
  const kMatch = str.match(/^([+-]?\d+(?:\.\d+)?)\s*k$/);
  if (kMatch) {
    const n = parseFloat(kMatch[1]);
    return isNaN(n) ? null : Math.round(n * 1000);
  }

  // Remove commas, spaces, currency symbols (₹, Rs, INR)
  const cleanStr = str.replace(/[₹$,\s]|rs\.?|inr/gi, '');
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Formats a number using standard Indian digit grouping (e.g. 60,56,52,845)
 */
export function formatIndianGrouping(num: number): string {
  if (isNaN(num)) return '0';
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const parts = absNum.toString().split('.');
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? `.${parts[1]}` : '';

  if (integerPart.length <= 3) {
    return `${isNegative ? '-' : ''}${integerPart}${decimalPart}`;
  }

  // Last 3 digits
  const last3 = integerPart.substring(integerPart.length - 3);
  const remaining = integerPart.substring(0, integerPart.length - 3);

  // Group remaining by 2 digits from right to left
  const otherGroups: string[] = [];
  let rem = remaining;
  while (rem.length > 2) {
    otherGroups.unshift(rem.substring(rem.length - 2));
    rem = rem.substring(0, rem.length - 2);
  }
  if (rem.length > 0) {
    otherGroups.unshift(rem);
  }

  const formattedInt = `${otherGroups.join(',')},${last3}`;
  return `${isNegative ? '-' : ''}${formattedInt}${decimalPart}`;
}

export function formatInr(num: number): string {
  return `₹ ${formatIndianGrouping(num)}`;
}

export function formatInrLakh(num: number): string {
  const inLakhs = num / 100000;
  const rounded = Number(inLakhs.toFixed(2));
  return `₹ ${formatIndianGrouping(rounded)} Lakh`;
}

export function formatInrCr(num: number): string {
  const inCr = num / 10000000;
  const rounded = Number(inCr.toFixed(2));
  return `₹ ${formatIndianGrouping(rounded)} Cr`;
}

export function formatPct(num: number): string {
  return `${Number(num.toFixed(1))}%`;
}
