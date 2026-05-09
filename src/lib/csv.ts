/**
 * Tiny RFC-4180-ish CSV parser. Handles double quotes (incl. "" escape) and
 * \r\n / \n line endings. No streaming — meant for small admin CSV uploads.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        field = "";
        if (row.some((f) => f.trim().length > 0)) rows.push(row);
        row = [];
      } else if (c === "\r") {
        // skip — \n on next char will close the row
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((f) => f.trim().length > 0)) rows.push(row);
  }
  return rows;
}

export function csvToRecords(
  text: string,
): { headers: string[]; rows: Record<string, string>[] } {
  const grid = parseCsv(text);
  if (grid.length === 0) return { headers: [], rows: [] };
  const headers = grid[0].map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];
  for (let r = 1; r < grid.length; r++) {
    const row: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]] = (grid[r][c] ?? "").trim();
    }
    rows.push(row);
  }
  return { headers, rows };
}
