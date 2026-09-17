export type ItemType = "software" | "defect" | "hardware" | "other";
export type PersonalPriority = "high" | "mid" | "low";
export type SourceKind =
  | "incident"
  | "customer"
  | "sales"
  | "support"
  | "roadmap"
  | "engineering"
  | "other";

export type ColumnRole =
  | "title"
  | "titleAlt"
  | "background"
  | "backgroundAlt"
  | "owner"
  | "submitter"
  | "status"
  | "source"
  | "productLine"
  | "bugId"
  | "companyClass"
  | "companyClassAlt"
  | "priority"
  | "period"
  | "accepted";

export type ColumnMapping = Partial<Record<ColumnRole, string>>;

export type SnapshotRow = Record<string, string>;

export type WeekProgress = "未开始" | "进行中" | "已完成" | "阻塞";

export type WorkItem = {
  id: string;
  title: string;
  background: string;
  owner: string;
  submitter: string;
  status: string;
  source: string;
  productLine: string;
  bugId: string;
  companyClass: string;
  sourcePriority: string;
  period: string;
  accepted: string;
  suggestedType: ItemType;
  type: ItemType;
  sourceKind: SourceKind;
  personalPriority: PersonalPriority;
  hours: number;
  inWeek: boolean;
  pinned: boolean;
  weekProgress: WeekProgress;
  raw: SnapshotRow;
};

export const TYPE_LABEL: Record<ItemType, string> = {
  software: "软件需求",
  defect: "缺陷",
  hardware: "硬件固件",
  other: "其他",
};

export const SOURCE_LABEL: Record<SourceKind, string> = {
  incident: "线上事故",
  customer: "客户需求",
  sales: "销售承诺",
  support: "技术支持",
  roadmap: "产品规划",
  engineering: "研发发起",
  other: "其他来源",
};

export const PRIORITY_LABEL: Record<PersonalPriority, string> = {
  high: "高",
  mid: "中",
  low: "低",
};

export const WEEK_PROGRESS_LABEL: WeekProgress[] = ["未开始", "进行中", "已完成", "阻塞"];

