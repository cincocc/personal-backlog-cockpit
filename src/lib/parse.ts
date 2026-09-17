import * as XLSX from "xlsx";
import type { SnapshotRow } from "./types";

function stringify(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

export function parseWorkbook(buffer: ArrayBuffer): { headers: string[]; rows: SnapshotRow[] } {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  return matrixToRows(matrix);
}

export function parseCsvText(text: string): { headers: string[]; rows: SnapshotRow[] } {
  const workbook = XLSX.read(text, { type: "string" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  return matrixToRows(matrix);
}

export function matrixToRows(
  matrix: Array<Array<string | number | null | undefined>>,
): { headers: string[]; rows: SnapshotRow[] } {
  const headerRow = (matrix[0] ?? []).map((h) => stringify(h));
  const headers = headerRow.filter((h) => h.length > 0);
  const rows: SnapshotRow[] = [];
  for (const raw of matrix.slice(1)) {
    const row: SnapshotRow = {};
    let any = false;
    headers.forEach((header, index) => {
      const value = stringify(raw[headerRow.indexOf(header)] ?? raw[index]);
      row[header] = value;
      if (value) any = true;
    });
    if (any) rows.push(row);
  }
  return { headers, rows };
}
