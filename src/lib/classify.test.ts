import { describe, expect, it } from "vitest";
import {
  suggestType,
  inferPersonalPriority,
  inferSourceKind,
  estimateHours,
} from "./classify";
import { packWeek } from "./packWeek";
import { guessMapping } from "./mapColumns";
import type { WorkItem } from "./types";

function item(partial: Partial<WorkItem> & Pick<WorkItem, "id" | "title">): WorkItem {
  return {
    background: "",
    owner: "Alex Chen",
    submitter: "",
    status: "待排期",
    source: "",
    productLine: "",
    bugId: "",
    companyClass: "B",
    sourcePriority: "",
    period: "",
    accepted: "",
    suggestedType: "software",
    type: "software",
    sourceKind: "other",
    personalPriority: "mid",
    hours: 4,
    inWeek: false,
    pinned: false,
    weekProgress: "未开始",
    raw: {},
    ...partial,
  };
}

describe("suggestType", () => {
  it("treats bug id as defect", () => {
    expect(suggestType({ bugId: "BUG-1", productLine: "ESL平台" })).toBe("defect");
  });

  it("treats hardware product lines as hardware", () => {
    expect(suggestType({ bugId: "", productLine: "EPD" })).toBe("hardware");
  });

  it("defaults software when platform-owned", () => {
    expect(suggestType({ bugId: "", productLine: "ESL平台" })).toBe("software");
  });
});

describe("inferSourceKind", () => {
  it("uses 来源 column then title keywords", () => {
    expect(
      inferSourceKind({
        source: "客户",
        title: "模板时区",
        background: "",
        type: "software",
      }),
    ).toBe("customer");
    expect(
      inferSourceKind({
        source: "",
        title: "P0 现场：整店价签停刷",
        background: "",
        type: "defect",
      }),
    ).toBe("incident");
  });
});

describe("inferPersonalPriority", () => {
  it("raises customer and incidents", () => {
    expect(
      inferPersonalPriority({
        sourceKind: "customer",
        sourcePriority: "",
        companyClass: "C",
        type: "software",
        title: "单位换算",
      }),
    ).toBe("high");
    expect(
      inferPersonalPriority({
        sourceKind: "other",
        sourcePriority: "",
        companyClass: "C",
        type: "software",
        title: "文案",
      }),
    ).toBe("mid");
  });
});

describe("estimateHours", () => {
  it("gives more hours to platform work than docs", () => {
    expect(
      estimateHours({
        type: "software",
        sourceKind: "customer",
        title: "单位换算做成平台配置",
        background: "",
        personalPriority: "high",
      }),
    ).toBe(8);
    expect(
      estimateHours({
        type: "software",
        sourceKind: "other",
        title: "补充配置说明文档",
        background: "",
        personalPriority: "low",
      }),
    ).toBe(2);
  });
});

describe("packWeek", () => {
  it("keeps pinned even when over capacity, then fills the rest", () => {
    const packed = packWeek(
      [
        item({ id: "1", title: "pin", hours: 10, pinned: true, personalPriority: "low" }),
        item({ id: "2", title: "high", hours: 4, personalPriority: "high" }),
        item({ id: "3", title: "skip", hours: 8, personalPriority: "mid" }),
      ],
      14,
    );
    expect(packed.map((row) => row.id)).toEqual(["1", "2"]);
  });
});

describe("guessMapping", () => {
  it("maps ding talk headers", () => {
    const mapping = guessMapping([
      "任务简述（一句话介绍要做什么）",
      "产品负责人(任务负责人)",
      "闭环状态",
      "当前任务状态（自动计算）",
      "任务编号（需要研发排查的bug需要填写）",
      "初步分类",
      "最终分类",
    ]);
    expect(mapping.title).toContain("任务简述");
    expect(mapping.owner).toContain("产品负责人");
    expect(mapping.bugId).toContain("任务编号");
    expect(mapping.status).toContain("当前任务状态");
    expect(mapping.companyClass).toContain("最终分类");
  });
});
