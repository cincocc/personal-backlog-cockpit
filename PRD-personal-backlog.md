# PRD：个人需求舱（Personal Backlog Cockpit）

## 1. Summary

This document specifies a personal overlay on a shared DingTalk bitable (多维表) used as a company-wide R&D task pool. The product does not replace the shared table. It lets one product manager import an Excel/CSV snapshot, isolate items they own, classify mixed work, and pack a week of work against personal capacity. The public GitHub demo uses fictional ESL (electronic shelf label) data only.

## 2. Contacts

| Name | Role | Comment |
| --- | --- | --- |
| Product owner (applicant) | ToB ESL SaaS PM | Sole user of the private snapshot; interview audience uses the sample library |
| Interviewer | Reviewer | Runs the hosted demo; does not connect to DingTalk |

## 3. Background

The company has no dedicated requirement system (no ZenTao-like tool). The R&D task pool lives in a shared DingTalk bitable. Everyone uses the same views. Personal filters cannot be changed freely. Software requirements, defects, firmware, and hardware work sit in one list.

A 2026 export of that table has **1,055 rows and 38 columns**. Useful fields exist, but they are incomplete, duplicated, and company-process oriented:

- Identity of “what to do” is split across `任务简述` (94% filled) and `需求描述` (45% filled). Only 75 rows have identical text in both.
- “Why” is split across `任务背景` (45%) and `需求背景` (37%).
- Owner exists: `产品负责人(任务负责人)` is filled on 89% of rows. Submitter is a different person on many rows.
- There is **no column named 需求 / 缺陷 / 硬件**. Defects are only hinted by `任务编号` (37% filled). Hardware/firmware is only hinted later by `投入团队` (23% filled).
- Company status is rich (`待澄清` / `待受理` / `待排期` / `已排期` / `已完成` / `已驳回`) but **priority is missing on 151 of 258 items still waiting to be scheduled**.
- Effort for packing a week is almost unusable: `产品预估工作量` is filled on 86% of rows but 893 of 910 values are `1`; true R&D person-days are filled on 2–4% of rows.

The shared table is the system of record. This initiative exists because a personal planning layer can be built from an export, without asking the company to change the bitable.

## 4. Objective

Give one PM a complete, usable weekly planning loop on top of a snapshot they already can export.

It matters for the job case: it shows problem framing, scope cuts, and a shipped tool, not a toy prompt.

**Key results (first release)**

- An interviewer can finish import → my-pool → week plan in **under 3 minutes** on the public sample file.
- After mapping columns once, the owner can filter to “items I own” without editing the shared DingTalk views.
- Every item in the personal pool has a **type** (software requirement / defect / hardware-firmware / other) that the user can override.
- Given a capacity in hours, the tool proposes a week pack the user can edit and copy out.
- Real company Excel is never required for the public site and must not appear in GitHub.

## 5. Market Segment(s)

Primary job: a B2B product manager who must plan their own work from a messy shared tracker they cannot redesign.

Constraints:

- Cannot modify shared views or columns at will.
- Cannot publish real customer or employee data.
- Must remain usable when the LLM is offline or has no API key.
- Single operator. No team login.

Not the segment: a PMO replacing Jira/ZenTao for the whole R&D org.

## 6. Value Proposition(s)

**Jobs**

- See only my slice of a mixed pool.
- Separate defects from product work and hardware/firmware work before a planning conversation.
- Fit work into this week’s hours instead of scrolling 1,000 rows.

**Gains**

- A stable personal view even when the shared table layout is frozen.
- A classification the shared table never stored as a first-class field.
- A week list that can be pasted into a meeting agenda.

**Pains avoided**

- Fighting other people over DingTalk views.
- Rebuilding filters every week.
- Treating “everything is 1 point” as a real estimate.

**Better than alternatives**

- Better than another personal sheet: import mapping + AI assist + capacity packing in one loop.
- Better than connecting DingTalk OpenAPI for a portfolio: interviewers cannot log into the company tenant; an export snapshot is honest and shippable.

## 7. Solution

### 7.1 UX / flow

1. **Import** — Upload `.xlsx` / `.csv`, or load the built-in sample.
2. **Map columns** — Match source headers to a small internal model. Remember the last mapping in the browser.
3. **My pool** — Default filter: `产品负责人` equals the selected person (demo: a fictional owner). Show company status as read-only context. Let the user set type, personal priority, and hours.
4. **Week pack** — User enters available hours. Tool fills a list using type, priority, and hours. User can pin, drop, or swap items. Copy Markdown / download CSV.

No account screen. No admin. No write-back to DingTalk.

### 7.2 Key features

| Feature | Behavior |
| --- | --- |
| Snapshot import | Parse first sheet. Ignore empty rows. Do not upload files to a server. |
| Column mapping | Required: title, owner. Recommended: status, source, product line, bug id, background, company class (A/B/C/D), accepted flag, period. |
| Title fallback | Prefer `任务简述`; if empty use `需求描述`. |
| Background fallback | Prefer `任务背景`; if empty use `需求背景`. |
| “Mine” rule | Match owner field to a chosen display name. Optional: also include rows I submitted. |
| Type assist | Rule fallback: bug id present → defect; team/line contains 固件/硬件/AP/EPD/LCD (user-editable dictionary) → hardware-firmware; else software requirement. LLM may suggest; user always wins. |
| Personal fields | type, personal priority, estimate hours, week bucket, notes. Stored only locally. |
| Capacity pack | Greedy fill by personal priority then company class, never exceeding hours unless user pins. |
| Demo library | Fictional ESL backlog with mixed types and multiple owners. |

### 7.3 Technology

Static web app (Vite + React + TypeScript). Persistence: browser `IndexedDB` (snapshot + mapping + personal overrides). Optional LLM call from the browser with a user-supplied key, or skip AI. Host on GitHub Pages or Vercel. **No application database.** The shared DingTalk table remains the system of record; this app is a disposable planning overlay.

### 7.4 Assumptions

- The owner can export the bitable to Excel without IT changing the table.
- Header names stay stable enough that a saved mapping still works week to week.
- “Mine” is primarily `产品负责人(任务负责人)`, not 提交人.
- Company class A/B/C/D is value/priority class, not requirement-vs-bug type.
- Public traffic will use the sample file; the author uses local export privately.

## 8. Release

**First version (about 10–14 days):** import, mapping, my pool, type assist with rules, week pack, sample data, README + this PRD.

**Not in v1:** DingTalk OpenAPI, write-back, multi-user auth, comments, attachments, sprint burndown, email, meeting minutes.

**Later (optional, still no product database):** a tiny serverless proxy only to hide an LLM API key for the public demo; private DingTalk sync as a personal script, not as the GitHub main path.
