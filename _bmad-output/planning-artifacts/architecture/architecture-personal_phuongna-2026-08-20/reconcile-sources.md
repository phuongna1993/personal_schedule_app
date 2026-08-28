---
title: Reconcile ARCHITECTURE-SPINE.md against PRD / EXPERIENCE.md / brief.md
created: 2026-08-29
status: analysis
---

# Reconciliation: ARCHITECTURE-SPINE.md vs 3 load-bearing sources

Sources compared:
- Spine: `architecture/architecture-personal_phuongna-2026-08-20/ARCHITECTURE-SPINE.md`
- Source A (PRD, primary): `prds/prd-personal_phuongna-2026-08-19/prd.md`
- Source B (UX behavior spine): `ux-designs/ux-personal_phuongna-2026-08-19/EXPERIENCE.md`
- Source C (brief): `briefs/brief-personal_phuongna-2026-08-19/brief.md`

Overall verdict: the spine is **substantively sound** — every FR has a home, the ERD gets the hard cases right (Task's physical split, NhomKhauPhan independence, the asymmetric Assessment-Test relationship, no auth/no cloud), and no PRD Non-Goal is violated. The defects found are internal-consistency/documentation defects in the Capability→Architecture Map, one real completeness gap (FR-10's note-field asymmetry has no governing rule), and one unaddressed technical seam (serving uploaded images from outside `public/`). None of these require re-architecting; all are fixable by editing the spine.

---

## 1. FR-1..FR-13 coverage in the Capability → Architecture Map

All 13 FRs have exactly one row in the map — coverage is complete. Most rows cite ADs that genuinely fit the FR (verified against the FR's actual Consequences text, not just presence of a citation):

- FR-1/FR-2/FR-5/FR-13 → AD-2 [ADOPTED] is the right call in all four cases: each is precisely the "current config row vs. history row" pattern AD-2 exists to name (Mẫu lịch trình vs. Lịch trình ngày; Ngân sách tháng hiện tại vs. tháng đã qua; Mốc hiện tại vs. Mốc đã Hoàn thành).
- FR-6 → "convention State & cross-cutting" + AD-3 is the correct governing pair (see §4 below for a closer check against EXPERIENCE.md's exact wording).
- FR-9 → AD-1 "(không đọc/ghi bảng module Chi tiêu)" directly and correctly restates the generalized Non-Goal (Thực đơn ↔ Chi tiêu).
- FR-4/FR-7/FR-12 → citing "convention Data & formats" (VNĐ as Int, DateTime/ISO) is defensible, if a little generic.

**Finding 1 (internal inconsistency, moderate severity) — AD "Binds" declarations disagree with the Capability→Architecture Map.**
Both AD-2 and AD-3 carry an explicit `Binds:` line naming which FRs they govern, but the Map table (the actual per-FR lookup surface a coding agent would use) doesn't consistently reflect those declarations:

- AD-2 declares `Binds: FR-1, FR-2, FR-3, FR-5, FR-13`, but the Map's FR-3 row lists only `AD-1, AD-3` — AD-2 is not cited even though AD-2 itself claims to govern FR-3.
- AD-3 declares `Binds: FR-1, FR-3, FR-4, FR-5, FR-6, FR-8, FR-9, FR-10, FR-11, FR-13`, but the Map only actually cites AD-3 for FR-3, FR-4, FR-6, FR-11. AD-3 is silently missing from the Map rows for **FR-1, FR-5, FR-8, FR-9, FR-10, FR-13** — all of which are plainly write operations (create/edit Mẫu lịch trình, CRUD Danh mục/Ngân sách, CRUD Món ăn/Nguyên liệu, select dishes into Thực đơn ngày, add a note, mark a Mốc complete) that must go through Server Actions per AD-3's own rule.

This won't mislead a coding agent about *whether* to use Server Actions (AD-3's rule is stated as a blanket "mọi thao tác ghi" elsewhere), but it is a genuine authoring inconsistency between two parts of the same document that should be reconciled — either narrow the `Binds:` lines or complete the Map citations.

**Finding 2 (real gap, low-moderate severity) — FR-10's governing citation doesn't actually govern anything about FR-10.**
Map row: `FR-10 Ghi chú điều chỉnh riêng bé 4 tuổi | Module Thực đơn | AD-1, convention Naming`.

"Convention Naming" (PascalCase model names, kebab-case routes, Glossary-term-in-UI) has no bearing on FR-10's actual shape. The load-bearing fact about FR-10 lives in EXPERIENCE.md's Component Patterns (`assign-col` row), not in the PRD alone: the ghi-chú field "chỉ tồn tại về mặt cấu trúc ở cột 'Người lớn & bé 4 tuổi' — cột 'Bé dưới 1 tuổi' không có trường này (không phải ẩn, mà không tồn tại)." That's a real data-modeling decision (does the note column live only on the adult-group's join row, or does a shared join row expose a nullable field that the baby-group side simply never uses?) and nothing in the spine — not an AD, not a convention, not the ERD (which explicitly punts attributes to "code responsibility") — actually answers it. The map's "convention Naming" citation is a placeholder that doesn't resolve the ambiguity. Recommend either adding a one-line AD-1 sub-rule ("note field is structurally scoped to the adult+4yo assignment, not a shared column") or accepting this as a Deferred/code-level decision explicitly (it currently is *not* listed in Deferred either).

## 2. ERD / data model vs. PRD Glossary — the tricky cases

Checked all 15 Glossary entities against the ERD's 15 entities (`NganHangMonAn` is correctly called out in prose as *not* a separate table — "nó chính là toàn bộ tập hợp các hàng MonAn" — matching the Glossary's definition of Ngân hàng món ăn as a collection, not an object). No entity is missing, none is spuriously invented.

Specific tricky cases requested:

- **NhomKhauPhan, 2 independent groups, not linked.** Correct. The ERD gives each `NhomKhauPhan` a parent-only relationship (`ThucDonNgay ||--o{ NhomKhauPhan : "lập riêng theo"`) and a downstream relationship to `MonAn`; there is no edge, direct or indirect, between the two NhomKhauPhan rows for a given day. That absence of a shared edge is exactly how "hoàn toàn độc lập" (EXPERIENCE.md's `assign-col` row: "không bao giờ đọc/ghi lên cột kia") should be expressed relationally. Good.
- **30%-remaining budget alert must be computed synchronously.** Correctly reflected — not in the ERD (there is rightly no "alert" entity/table; it's a derived value, not stored state) but in the State & cross-cutting convention, which requires the `GiaoDich`-writing Server Action to compute and return the alert status in the same response. See §4 for a closer wording check.
- **English roadmap's Assessment-Test gate vs. Automation's no-gate asymmetry (FR-13).** Correctly modeled at the relationship level: `Moc ||--o{ BaiTestDanhGia : "yêu cầu (chỉ Lộ trình Tiếng Anh)"`. Two things worth noting:
  - The `o{` (zero-or-many) cardinality on the Mốc side is the right call, not an oversimplification — FR-12's consequence explicitly requires viewing "Điểm số của các Bài test đánh giá đã làm theo thời gian, để thấy được xu hướng tiến bộ" (plural, trend over time), meaning retakes must be possible before a Mốc is marked complete.
  - The *annotation* ("chỉ Lộ trình Tiếng Anh") correctly flags the asymmetry, but the actual **enforcement** of the gate (Server Action must block "Hoàn thành" on an English Mốc until a `BaiTestDanhGia` + score exists, but never block it for Automation Test) is not named as an architectural rule anywhere (not in AD-2, AD-3, or the Map's FR-13 row). This is arguably fine — the spine's own stated policy is to leave FR-level business logic to the FR text and defer implementation specifics to code — but it means the *only* place this asymmetry is stated as a build requirement is the PRD's FR-13 Notes paragraph and the ERD comment. Given how easy this rule is to get backwards (gate the wrong skill, or gate neither), this is worth a one-line explicit callout in the spine if the goal is to make the substrate self-sufficient for an AI coding agent that might not weight a small ERD-edge label as heavily as a Rule bullet.
- **Task's dual life (AD-2's physical-table split).** Correctly and explicitly handled — done better than the other three cases, in fact. The ERD deliberately merges `MauLichTrinh`'s and `LichTrinhNgay`'s Task relationships into one conceptual `Task` node "để giữ ERD gọn," then immediately calls out in prose that AD-2 requires these to be two separate physical Prisma tables with no shared FK-joined table. This directly pre-empts the most likely modeling mistake (a single `Task` table with a nullable `mauLichTrinhId` XOR `lichTrinhNgayId`, which would violate AD-2's "never UPDATE a pre-existing history row" invariant the moment someone edits a Task's shared row). Good catch, correctly resolved.

**Finding 3 (design choice, not a defect) — MonAn/NguyenLieu cardinality.** The ERD uses `MonAn ||--o{ NguyenLieu : "gồm"` (one-to-many, not many-to-many). This matches the Glossary precisely: "Nguyên liệu — một thành phần cụ thể dùng trong **một** Món ăn," i.e., ingredients are not a shared catalog reused across dishes (FR-8's "lọc Món ăn theo Nguyên liệu" is a text/name search over each dish's own ingredient rows, not a join against a global ingredient master). It would have been easy to over-normalize this into many-to-many; the spine got it right. Flagged here only so this doesn't get "fixed" into many-to-many later by someone assuming normalization is always better.

**Minor observation — meal slot (bữa: sáng/trưa/tối) isn't named anywhere in the ERD**, not even as an annotation. FR-9 requires 3 independent meal slots per portion group per day. The ERD's stated policy ("thuộc tính là việc của code") makes this defensible as an attribute-level detail on whatever join row connects `NhomKhauPhan` to `MonAn`, but it's the one piece of FR-9's cardinality that isn't visible anywhere in the Structural Seed, so it's worth double-checking during schema authoring that "3 bữa" doesn't get collapsed into a single MonAn per NhomKhauPhan per day by mistake. Not scored as a defect since it's consistent with the ERD's own explicit "attributes are code's job" scoping choice.

## 3. Non-Goal violations

Checked against all 6 PRD Non-Goals (§5) plus their MVP-scope restatement (§6.2) and the brief's phrasing. **No violations found:**

- No auth/multi-user/tenant: AD-5 explicitly forbids `User`/`Session`/`Account` models or any tenant-partitioning column — directly on-point.
- No mobile/responsive: nothing in the spine's Stack, Structural Seed, or Deferred sections introduces responsive breakpoints, a mobile shell, or a PWA manifest; DESIGN.md's visual system is correctly left out of architecture scope.
- No cloud sync: AD-6 explicitly forbids hosting config, CI/CD, Dockerfiles, or per-environment env vars, and pins persistence to a single local SQLite file outside the repo.
- No active notifications: the State & cross-cutting convention explicitly rules out "một kênh poll/notification/subscription riêng biệt" for the budget alert — this reinforces the Non-Goal rather than eroding it.
- No Thực đơn↔Chi tiêu link: AD-1 generalizes this specific Non-Goal into the cross-module boundary rule and the Map's FR-9 row restates it directly.
- Commercialization: not architecture-relevant; nothing in the spine implies it either way.

## 4. Budget-alert convention vs. EXPERIENCE.md's "phải hiện diện ngay tại nơi/thời điểm phát sinh"

EXPERIENCE.md (Foundation): "mọi cảnh báo (ví dụ ngân sách) phải hiện diện ngay tại nơi/thời điểm phát sinh, không qua kênh thông báo riêng biệt."

Spine (State & cross-cutting convention): "Server Action ghi `GiaoDich` phải tự tính và trả kèm trạng thái cảnh báo ngân sách (nếu có) ngay trong cùng response của lệnh ghi đó — không qua một kênh poll/notification/subscription riêng biệt."

**No loss in translation.** The UX requirement is about *where/when* the alert must appear (same place, same instant, as a direct consequence of the user's own action); the architecture convention is the correct mechanical translation of that into a Next.js Server Actions world — computing and returning the alert synchronously inside the same mutation response is precisely what makes "no separate notification channel" achievable in a Server-Actions architecture (there is no polling/subscription primitive available anyway in this stack, so this also happens to be the only mechanism that *could* satisfy the UX requirement). The convention is correctly scoped to the `GiaoDich`-write action only, which matches the PRD's own Consequence text for FR-6 ("Cảnh báo hiển thị ngay khi ghi Giao dịch khiến Danh mục chạm ngưỡng") — the PRD does not require the alert to re-trigger from a Ngân sách edit (FR-5) with no accompanying Giao dịch, so the convention correctly does *not* over-extend to cover that case.

## 5. Glossary-term synonym drift

Scanned all spine prose (AD rule text, conventions table, Structural Seed comments, ERD edge labels, Deferred bullets) against the PRD's 15 Glossary terms and EXPERIENCE.md's terminology table. **None found.** Every Glossary noun used in spine prose matches the PRD's exact term (Task, Giao dịch, Danh mục chi tiêu, Ngân sách, Mẫu lịch trình, Lịch trình ngày, Món ăn, Nguyên liệu, Ngân hàng món ăn, Nhóm khẩu phần, Thực đơn ngày, Kỹ năng, Lộ trình, Mốc, Buổi học, Bài test đánh giá). Module short-names used as folder labels ("Lịch trình", "Chi tiêu", "Thực đơn", "Học tập") are abbreviations of PRD Feature titles (§4.1–4.4), not synonym substitutions for Glossary entities, and full Glossary terms are still used correctly wherever an entity is actually being referenced. As expected/pre-approved, Prisma model names (PascalCase, no diacritics) are not counted as violations.

## 6. Additional observation (outside the 5 requested checks, but load-bearing)

**AD-4 doesn't address how uploaded images get served back to the browser.** AD-4 correctly keeps image bytes out of SQLite and puts them on disk under `app-data/uploads/`, and AD-6 correctly places `app-data/` outside the repo (sibling to `app/`, `prisma/`, `lib/` — not under `public/`). But Next.js only auto-serves static files placed under `public/`; a directory outside `public/` needs an explicit read path to reach the browser (typically a route handler streaming the file, or a dynamic image-serving endpoint). AD-3 forbids `app/api/**/route.ts` "cho CRUD," which arguably leaves room for a *read-only* image-serving route without violating AD-3's letter — but the spine never says so, leaving a real implementation question (how does `<img src=...>` for a Món ăn photo actually resolve?) unanswered by any AD. Recommend either a one-line addendum to AD-4 naming the serving mechanism, or an explicit Deferred entry so it isn't accidentally treated as "obviously covered."

---

## Summary of gaps found

1. **Map/Binds inconsistency** — AD-2's and AD-3's `Binds:` lines claim FRs (FR-3 for AD-2; FR-1, FR-5, FR-8, FR-9, FR-10, FR-13 for AD-3) that the Capability→Architecture Map doesn't actually cite for those rows. Editorial fix, not a design flaw.
2. **FR-10's governing citation ("convention Naming") doesn't substantively govern FR-10** — the real load-bearing fact (note field structurally scoped to one portion group, per EXPERIENCE.md) has no home in any AD/convention/Deferred entry.
3. **FR-13's Assessment-Test gate enforcement** is correctly modeled in the ERD annotation but not elevated to a Rule/AD — low risk given it's explicit in the PRD's own FR-13 text, but worth a one-line callout given how easy the asymmetry is to invert.
4. **Image-serving path (AD-4) is unaddressed** — disk storage location is specified but the read/serving mechanism back to the browser is not, and sits in mild tension with AD-3's API-route restriction.

No Non-Goal violations, no Glossary synonym drift, no ERD/data-model errors on any of the four "tricky" cases named in the task (NhomKhauPhan independence, synchronous budget-alert computation, the Assessment-Test asymmetry, and Task's AD-2 physical split) — all four are handled correctly. The budget-alert convention is a faithful, non-lossy translation of EXPERIENCE.md's UX requirement into the Server Actions mechanism.
