/**
 * Builds an RFC 4180 CSV document. Text cells that start with = + - @ (or a tab/CR) are
 * prefixed with an apostrophe so Excel won't run them as formulas ("CSV injection").
 * Numbers are written as numbers. A UTF-8 byte-order mark is added so Excel shows Arabic correctly.
 */
export type CsvCell = string | number | boolean | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(cell).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}
