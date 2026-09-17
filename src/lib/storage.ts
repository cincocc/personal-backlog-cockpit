import type { ColumnMapping, SnapshotRow, WorkItem } from "./types";
import {
  estimateHours,
  inferPersonalPriority,
  inferSourceKind,
  suggestType,
} from "./classify";
import { firstFilled, cell } from "./mapColumns";

const SNAP = "cockpit-snap-v4";
const PREFS = "cockpit-prefs-v4";

export type SavedPrefs = {
  mapping: ColumnMapping;
  owner: string;
  includeSubmitter: boolean;
  capacity: number;
  overrides: Record<
    string,
    Partial<
      Pick<
        WorkItem,
        "type" | "sourceKind" | "personalPriority" | "hours" | "inWeek" | "pinned" | "weekProgress"
      >
    >
  >;
};

export type SavedState = SavedPrefs & {
  headers: string[];
  rows: SnapshotRow[];
};

export function loadState(): SavedState | null {
  try {
    const snapRaw = localStorage.getItem(SNAP);
    const prefsRaw = localStorage.getItem(PREFS);
    if (!snapRaw) return null;
    const snap = JSON.parse(snapRaw) as { headers: string[]; rows: SnapshotRow[] };
    const prefs = prefsRaw
      ? (JSON.parse(prefsRaw) as SavedPrefs)
      : {
          mapping: {},
          owner: "",
          includeSubmitter: false,
          capacity: 20,
          overrides: {},
        };
    return { ...snap, ...prefs };
  } catch {
    return null;
  }
}

export function saveSnapshot(headers: string[], rows: SnapshotRow[]): void {
  localStorage.setItem(SNAP, JSON.stringify({ headers, rows }));
}

export function savePrefs(prefs: SavedPrefs): void {
  localStorage.setItem(PREFS, JSON.stringify(prefs));
}

export function clearState(): void {
  localStorage.removeItem(SNAP);
  localStorage.removeItem(PREFS);
}

export function uniqueOwnersFromRows(rows: SnapshotRow[], ownerHeader?: string): string[] {
  if (!ownerHeader) return [];
  const names = new Set<string>();
  for (const row of rows) {
    const name = (row[ownerHeader] ?? "").trim();
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "zh"));
}

export function buildItems(
  rows: SnapshotRow[],
  mapping: ColumnMapping,
  overrides: SavedPrefs["overrides"],
): WorkItem[] {
  return rows.map((row, index) => {
    const id = String(index);
    const title = firstFilled(row, mapping.title, mapping.titleAlt) || `未命名 ${index + 1}`;
    const background = firstFilled(row, mapping.background, mapping.backgroundAlt);
    const owner = cell(row, mapping.owner);
    const submitter = cell(row, mapping.submitter);
    const status = cell(row, mapping.status);
    const source = cell(row, mapping.source);
    const productLine = cell(row, mapping.productLine);
    const bugId = cell(row, mapping.bugId);
    const companyClass = firstFilled(row, mapping.companyClass, mapping.companyClassAlt);
    const sourcePriority = cell(row, mapping.priority);
    const period = cell(row, mapping.period);
    const accepted = cell(row, mapping.accepted);
    const suggestedType = suggestType({ bugId, productLine });
    const patch = overrides[id] ?? {};
    const type = patch.type ?? suggestedType;
    const sourceKind =
      patch.sourceKind ?? inferSourceKind({ source, title, background, type });
    const personalPriority =
      patch.personalPriority ??
      inferPersonalPriority({
        sourceKind,
        sourcePriority,
        companyClass,
        type,
        title,
      });
    const hours =
      patch.hours ??
      estimateHours({
        type,
        sourceKind,
        title,
        background,
        personalPriority,
      });
    return {
      id,
      title,
      background,
      owner,
      submitter,
      status,
      source,
      productLine,
      bugId,
      companyClass,
      sourcePriority,
      period,
      accepted,
      suggestedType,
      type,
      sourceKind,
      personalPriority,
      hours,
      inWeek: patch.inWeek ?? false,
      pinned: patch.pinned ?? false,
      weekProgress: patch.weekProgress ?? "未开始",
      raw: row,
    };
  });
}

export function isMine(
  item: WorkItem,
  owner: string,
  includeSubmitter: boolean,
): boolean {
  if (!owner) return true;
  if (item.owner === owner) return true;
  return includeSubmitter && item.submitter === owner;
}
