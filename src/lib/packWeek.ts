import type { WorkItem } from "./types";
import { classRank, priorityRank, sourceRank } from "./classify";

export function sortCandidates(items: WorkItem[]): WorkItem[] {
  return [...items].sort((a, b) => {
    const p = priorityRank(a.personalPriority) - priorityRank(b.personalPriority);
    if (p !== 0) return p;
    const s = sourceRank(a.sourceKind) - sourceRank(b.sourceKind);
    if (s !== 0) return s;
    return classRank(a.companyClass) - classRank(b.companyClass);
  });
}

export function packWeek(items: WorkItem[], capacityHours: number): WorkItem[] {
  const pinned = items.filter((item) => item.pinned);
  const rest = sortCandidates(items.filter((item) => !item.pinned));
  const chosen: WorkItem[] = [...pinned];
  let used = pinned.reduce((sum, item) => sum + item.hours, 0);
  for (const item of rest) {
    if (used + item.hours > capacityHours) continue;
    chosen.push(item);
    used += item.hours;
  }
  return chosen;
}

export function weekMarkdown(items: WorkItem[], owner: string, hours: number): string {
  const total = items.reduce((sum, item) => sum + item.hours, 0);
  const lines = [
    `# ${owner} 本周清单`,
    `容量 ${hours}h · 已装 ${total}h · ${items.length} 条`,
    "",
  ];
  items.forEach((item, index) => {
    const pin = item.pinned ? " [钉住]" : "";
    lines.push(
      `${index + 1}. ${item.weekProgress} · ${item.title} · ${item.hours}h · ${item.bugId || "无编号"}${pin}`,
    );
  });
  return lines.join("\n");
}

export function syncBackMarkdown(items: WorkItem[]): string {
  const done = items.filter((item) => item.weekProgress === "已完成");
  const blocked = items.filter((item) => item.weekProgress === "阻塞");
  const doing = items.filter((item) => item.weekProgress === "进行中");
  const lines = [
    "# 待回写到研发任务池",
    `已完成 ${done.length} · 进行中 ${doing.length} · 阻塞 ${blocked.length}`,
    "",
  ];
  function section(title: string, list: WorkItem[], suggest: string) {
    if (!list.length) return;
    lines.push(`## ${title}`);
    list.forEach((item) => {
      lines.push(
        `- ${item.bugId || "（无编号）"} | ${item.title} | 原状态：${item.status || "空"} → 建议改为：${suggest}`,
      );
    });
    lines.push("");
  }
  section("已完成（建议任务池改为已完成）", done, "已完成");
  section("阻塞（建议任务池保持原状态并备注）", blocked, itemStatusOrKeep);
  section("进行中（建议任务池改为已排期/执行中）", doing, "已排期");
  if (done.length + blocked.length + doing.length === 0) {
    lines.push("本周还没有需要回写的状态变更。");
  }
  return lines.join("\n");
}

const itemStatusOrKeep = "保持原状态 + 备注阻塞";
