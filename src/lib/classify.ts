import type { ItemType, PersonalPriority, SourceKind } from "./types";

const HARDWARE_LINE = /固件|硬件|(^|[,/])\s*(AP|EPD|LCD)(\s|$|[,/])/;
const INCIDENT = /P0|整店|停刷|线上事故|生产事故|重大故障|现场：/;
const CUSTOMER_TEXT = /客户|门店|K客|重点客户/;
const SALES_TEXT = /销售承诺|售前|合同/;

export function suggestType(input: { bugId: string; productLine: string }): ItemType {
  if (input.bugId.trim()) return "defect";
  if (HARDWARE_LINE.test(input.productLine)) return "hardware";
  return "software";
}

export function inferSourceKind(input: {
  source: string;
  title: string;
  background: string;
  type: ItemType;
}): SourceKind {
  const blob = `${input.title} ${input.background}`;
  if (INCIDENT.test(blob) || (input.type === "defect" && INCIDENT.test(input.title))) {
    return "incident";
  }
  const src = input.source;
  if (src.includes("客户")) return "customer";
  if (src.includes("销售")) return "sales";
  if (src.includes("技术支持")) return "support";
  if (/产品RoadMap|产品规划|RoadMap/i.test(src)) return "roadmap";
  if (/研发/.test(src)) return "engineering";
  if (CUSTOMER_TEXT.test(blob)) return "customer";
  if (SALES_TEXT.test(blob)) return "sales";
  if (src.includes("其他") || !src) return "other";
  return "other";
}

export function inferPersonalPriority(input: {
  sourceKind: SourceKind;
  sourcePriority: string;
  companyClass: string;
  type: ItemType;
  title: string;
}): PersonalPriority {
  if (
    input.sourceKind === "incident" ||
    input.sourceKind === "customer" ||
    input.sourceKind === "sales" ||
    (input.sourceKind === "support" && input.type === "defect") ||
    input.sourcePriority.includes("高") ||
    input.companyClass.startsWith("A") ||
    input.companyClass.includes("P0") ||
    INCIDENT.test(input.title)
  ) {
    return "high";
  }
  if (input.sourcePriority.includes("低") || input.companyClass.startsWith("D")) {
    return "low";
  }
  return "mid";
}

export function estimateHours(input: {
  type: ItemType;
  sourceKind: SourceKind;
  title: string;
  background: string;
  personalPriority: PersonalPriority;
}): number {
  const text = `${input.title} ${input.background}`;
  if (/文档|说明|截图|文案/.test(text) && input.type !== "defect") return 2;
  if (/重构|平台化|方案输出|单位换算/.test(text)) return 8;
  if (input.type === "hardware") return 8;
  if (input.sourceKind === "incident" || input.personalPriority === "high") {
    if (input.type === "defect") return 4;
    return 6;
  }
  if (input.type === "defect") return 3;
  if (text.length > 80) return 6;
  return 4;
}

export function isClosed(status: string): boolean {
  return status.includes("已完成") || status.includes("已驳回") || status.includes("已闭环");
}

export function sourceRank(kind: SourceKind): number {
  const order: SourceKind[] = [
    "incident",
    "customer",
    "sales",
    "support",
    "roadmap",
    "engineering",
    "other",
  ];
  return order.indexOf(kind);
}

export function classRank(companyClass: string): number {
  const head = companyClass.trim().charAt(0).toUpperCase();
  if (head === "A") return 0;
  if (head === "B") return 1;
  if (head === "C") return 2;
  if (head === "D") return 3;
  return 4;
}

export function priorityRank(priority: PersonalPriority): number {
  if (priority === "high") return 0;
  if (priority === "mid") return 1;
  return 2;
}
