import type { ColumnMapping, ColumnRole } from "./types";

const HINTS: Record<ColumnRole, string[]> = {
  title: ["任务简述", "需求描述", "标题", "title"],
  titleAlt: ["需求描述"],
  background: ["任务背景", "需求背景", "背景"],
  backgroundAlt: ["需求背景"],
  owner: ["产品负责人", "任务负责人", "负责人", "owner"],
  submitter: ["提交人"],
  status: ["当前任务状态", "状态"],
  source: ["来源"],
  productLine: ["涉及产品线", "产品线"],
  bugId: ["任务编号", "bug"],
  companyClass: ["最终分类", "初步分类"],
  companyClassAlt: ["初步分类"],
  priority: ["优先级"],
  period: ["哪一期规划"],
  accepted: ["是否受理"],
};

export function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();

  function findBest(hints: string[]): string | undefined {
    for (const hint of hints) {
      const exact = headers.find((h) => !used.has(h) && h === hint);
      if (exact) return exact;
      const contains = headers.find(
        (h) => !used.has(h) && h.toLowerCase().includes(hint.toLowerCase()),
      );
      if (contains) return contains;
    }
    return undefined;
  }

  for (const [role, hints] of Object.entries(HINTS) as Array<[ColumnRole, string[]]>) {
    const hit = findBest(hints);
    if (hit) {
      mapping[role] = hit;
      if (role !== "titleAlt" && role !== "backgroundAlt" && role !== "companyClassAlt") {
        used.add(hit);
      }
    }
  }

  if (mapping.title && mapping.titleAlt === mapping.title) {
    const second = headers.find(
      (h) => h !== mapping.title && HINTS.titleAlt.some((hint) => h.includes(hint)),
    );
    mapping.titleAlt = second;
  }
  if (mapping.background && mapping.backgroundAlt === mapping.background) {
    const second = headers.find(
      (h) => h !== mapping.background && HINTS.backgroundAlt.some((hint) => h.includes(hint)),
    );
    mapping.backgroundAlt = second;
  }
  return mapping;
}

export function cell(row: Record<string, string>, header?: string): string {
  if (!header) return "";
  return (row[header] ?? "").trim();
}

export function firstFilled(
  row: Record<string, string>,
  primary?: string,
  fallback?: string,
): string {
  return cell(row, primary) || cell(row, fallback);
}
