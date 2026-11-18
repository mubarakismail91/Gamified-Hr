import { toCsv } from './csv.util';

const body = (csv: string) => csv.replace(/^﻿/, '');

describe('toCsv', () => {
  it('starts with a UTF-8 byte-order mark (so Excel shows Arabic) and uses CRLF line endings', () => {
    const csv = toCsv(['a', 'b'], [[1, 'x']]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(body(csv)).toBe('a,b\r\n1,x\r\n');
  });

  it('quotes cells containing commas, quotes or line breaks', () => {
    expect(body(toCsv(['t'], [['Hello, "world"'], ['two\nlines']]))).toBe('t\r\n"Hello, ""world"""\r\n"two\nlines"\r\n');
  });

  it('writes empty cells for null/undefined and keeps numbers and booleans as-is', () => {
    expect(body(toCsv(['a', 'b', 'c', 'd'], [[null, undefined, -3.5, true]]))).toBe('a,b,c,d\r\n,,-3.5,true\r\n');
  });

  it('neutralises spreadsheet formulas in text cells (CSV injection)', () => {
    const out = body(toCsv(['t'], [['=HYPERLINK("http://x")'], ['+1'], ['@SUM(A1)'], ['-2']]));
    expect(out).toBe('t\r\n"\'=HYPERLINK(""http://x"")"\r\n\'+1\r\n\'@SUM(A1)\r\n\'-2\r\n');
  });

  it('keeps Arabic text unchanged', () => {
    expect(body(toCsv(['t'], [['استبانة نوفمبر']]))).toBe('t\r\nاستبانة نوفمبر\r\n');
  });
});
