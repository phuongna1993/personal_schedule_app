# Rubric Review — ARCHITECTURE-SPINE.md (App Quản Lý Cá Nhân Đa Năng)

**Reviewed artifact:** `_bmad-output/planning-artifacts/architecture/architecture-personal_phuongna-2026-08-20/ARCHITECTURE-SPINE.md`
**Rationale source:** `.memlog.md` in the same folder
**Context:** personal hobby, single-user Next.js+Prisma+SQLite monolith, build-substrate purpose, altitude=initiative, 13 PRD FRs bound, 4 concurrently-built modules.
**Calibration:** judged as a solo/hobby project — no penalty for absent enterprise concerns (security hardening, multi-tenant isolation, CI/CD, compliance).

## Verdict

**Conditional pass.** The spine is well-scoped for its altitude, its ADs are traceable to real PRD/UX decisions (not invented), and the memlog shows a genuine reconciliation pass already happened (4 gaps found and fixed). One concrete binding gap remains (FR-2 ↔ AD-3) that should be patched before this is used as build substrate, and one AD (AD-2) carries a real-but-proportionate enforcement weakness worth a one-line acknowledgment. Everything else is minor or informational.

---

## Checklist Walkthrough

### 1. Fixes the real divergence points for the level below — misses one

Five of six ADs land on genuine "two AI-agent sessions would otherwise do this differently" risks: module coupling (AD-1), config-vs-history mutation (AD-2), a second write surface via API routes (AD-3), blob-vs-path image storage (AD-4), and environment sprawl (AD-6). AD-5 (no auth) is a low-risk but cheap-to-state guardrail given the PRD non-goal.

**Gap found:** FR-2 ("Khởi tạo Lịch trình ngày từ Mẫu" — initialize today's schedule from the template) is itself a write (INSERT of a new `LichTrinhNgay` + `Task` rows), but it is bound only to AD-1 and AD-2 in the Capability→Architecture Map — **not AD-3**. AD-3's own Binds line (`FR-1, FR-3, FR-4, FR-5, FR-6, FR-8, FR-9, FR-10, FR-11, FR-13`) likewise omits FR-2. Compare with FR-5 (Ngân sách, which has the same "does the current period's row get lazily created?" shape) — that one *is* bound to AD-3. This looks like the exact class of gap the memlog's own reconciliation pass (event 4) was hunting for, just missed on this one row.

Why it matters concretely: "initialize today's row if it doesn't exist yet" is a classic candidate for being folded into the page's read path (a Server Component doing a `findFirst` and, if empty, an inline `create`) rather than an explicit Server Action — especially tempting since AD-3's own text says reads may go through a Server Component calling Prisma directly. Without an explicit anchor, a future build pass has no rule telling it that FR-2's write must still go through `actions.ts`, which is precisely the "two mutation surfaces drift apart" divergence AD-3 exists to prevent.

**Fix:** add FR-2 to AD-3's Binds line and to its Capability Map row (`AD-1, AD-2 [ADOPTED], AD-3`), and optionally add one clause noting that "khởi tạo Lịch trình ngày" counts as a write even when triggered implicitly by opening today's view, so it must still go through a Server Action.

### 2. Every AD's Rule is enforceable and actually prevents its divergence — mostly yes, one weak spot

- AD-1, AD-3, AD-4, AD-5, AD-6: enforceable by simple, checkable file/schema conventions (no cross-module Prisma import, no `app/api/**/route.ts` CRUD handler, no blob column, no `User` model, no Dockerfile/CI file). A single grep/code-review pass can verify compliance. Good fit for a solo-build substrate that doesn't need lint tooling specified.
- **AD-2 is the one structurally weak Rule.** It correctly identifies the divergence (editing "current config" must never rewrite a past snapshot row) and states the invariant well, but the enforcement mechanism is purely a written instruction to "self-check before writing" inside each Server Action — there is no schema-level or middleware-level backstop (e.g., a Prisma extension/middleware that rejects `update()` calls against rows flagged historical, or modeling historical rows so they physically lack an update path). Nothing in the architecture would catch a future Server Action that calls `.update()` on a past `LichTrinhNgay`/`NganSach`/`Moc` row by mistake — it would only surface as silent data corruption. Given AD-2 is the AD explicitly protecting against data corruption (the single highest-consequence failure mode in this app), a purely conventional enforcement is a real, if proportionate, gap.
  - This is **not** a blocking finding at hobby stakes (worst case is corrected by hand in a single SQLite file), but it deserves at least a one-line acknowledgment in the spine itself (e.g., "enforced by code convention only; no DB-level guard") so a future build pass doesn't over-trust the rule.
- The `BaiTestDanhGia` gate clause folded into AD-2 (block "Hoàn thành" for the English roadmap without a scored assessment) is more tractable — it's a single-function precondition check, easy to get right and easy to code-review.

### 3. Nothing under Deferred is secretly load-bearing — mostly clean, one soft spot

- Backup/export, test/QA strategy, unmocked screen layouts, assessment-content storage format: all correctly deferred — none of these create a data-model or mutation-surface disagreement between two build passes; they're either genuinely out of scope (backup/export is a stated PRD non-goal) or not yet specified enough to decide (assessment content format, screen layouts).
- **Soft spot:** UI component library / styling approach (Tailwind/shadcn vs plain CSS) is deferred as "a build-time choice, not an architectural invariant." That's a reasonable call given DESIGN.md already fixes the bespoke visual system (colors, spacing, components) independent of implementation technology. The risk of two modules landing on different styling mechanisms is low here specifically because the scope note says all 4 modules are "build đồng thời, không chia giai đoạn" (built concurrently in one pass, not phased) — a single continuous build pass naturally converges on one approach. Flagging only as a low-severity note: if the actual build ever splits across sessions/agents, this deferred item would stop being safe to defer.

### 4. Named tech is verified-current — plausible, one unflagged caveat

Next.js 16.3.x / Prisma 7.10.x / SQLite 3.46.x via `better-sqlite3` adapter / Node 24.x LTS "Krypton" / TypeScript 5.9.x / React 19.2.x are internally consistent (Next 16.3 pairing with React 19.2 tracks; Node's periodic-table LTS codenames continuing past "Jod" (22) to "Krypton" (24) is directionally correct) and the memlog shows real verification effort — Next.js/Node/React were web-search-verified, and Prisma 7.10.x (rather than the newer Prisma 8) was a deliberate, well-reasoned choice given Prisma 8's Aug-2026 release being too fresh for reliable AI-agent coverage.

**Gap:** the memlog explicitly flags "TS version is best-current-knowledge estimate not independently verified," but the Stack table in the spine itself carries no such caveat — it presents TypeScript 5.9.x with the same confidence as the verified entries. Anyone consuming the spine without also reading the memlog (the more likely path, since the spine is the actual build substrate) would not know this one entry is a guess. Low severity (TS minor-version mismatches rarely break anything), but worth a footnote or asterisk in the Stack table for consistency with how carefully the rest of the table's provenance is treated.

### 5. Every dimension this altitude owns is decided/deferred/open — yes, including deployment/ops

- Deployment/environment: **decided** (AD-6 — dev-only, single machine, gitignored `app-data/`, explicitly no Dockerfile/CI/CD/staging-prod split).
- Auth/multi-tenancy: **decided** (AD-5 — none).
- Data mutation surface: **decided** (AD-3).
- Data lifecycle (config vs. history): **decided** (AD-2).
- Module boundaries: **decided** (AD-1).
- File/blob storage: **decided** (AD-4).
- Naming/formats/IDs, error-shape convention, cross-cutting alert-in-response pattern: **decided** (Consistency Conventions table).
- Testing/QA strategy, backup/export, UI kit, unmocked layouts, assessment content format: **explicitly deferred** with a stated reason each.
- No dimension is silently absent. Minor items not mentioned at all (DB migration workflow, seed-data bootstrap, logging) are reasonably implicit in "use Prisma the normal way" / "console output is enough for one user" and don't rise to the level of needing an explicit line at this altitude for a hobby app — not flagged as findings, just noted as checked-and-fine.

### 6. Capability→Architecture Map covers all 13 FRs — yes, with the one binding gap above

All FR-1 through FR-13 have a row. Content is otherwise accurate against each AD's stated Binds line (per the memlog's own reconciliation pass), except for the FR-2/AD-3 omission detailed in §1 above, which is the same class of check that pass already ran and should be re-run once more.

---

## Findings (severity-tagged, most important first)

1. **[MEDIUM-HIGH] FR-2 is missing from AD-3's Binds line and from its own Capability Map row**, despite "khởi tạo Lịch trình ngày từ Mẫu" being a write. This leaves the day-initialization write path without an explicit rule anchor, risking it being implemented inline inside a Server Component's read path instead of through `actions.ts` — exactly the two-mutation-surface drift AD-3 exists to prevent. *Fix: add FR-2 to AD-3's Binds and Map row; optionally add a clause noting implicit/lazy writes still count as writes under AD-3.*

2. **[MEDIUM] AD-2 (historical immutability) has no structural enforcement**, only a "Server Action must self-check" instruction. It is the architecture's single most consequence-bearing rule (protects against silent data corruption of past schedule/budget/milestone rows) yet nothing in the schema or tooling would catch a future `.update()` call against a historical row. Proportionate for hobby stakes, but worth a one-line caveat in the spine so it isn't mistaken for a stronger guarantee than it is.

3. **[LOW] Stack table doesn't carry forward the memlog's own confidence caveat on TypeScript 5.9.x** ("estimate, not independently verified"), while every other entry was web-search-verified. A reader of the spine alone can't tell these two confidence levels apart.

4. **[LOW] UI styling/component-library choice is deferred**; safe given the stated concurrent, non-phased build, but would stop being safe if the build ever splits across separate sessions/agents — worth remembering if scope execution changes.

5. **[INFORMATIONAL] No explicit mention of Prisma migration workflow or initial seed-data bootstrap** (e.g., how the first `MauLichTrinh` gets created). Reasonably left implicit at this altitude for a solo hobby build; not a blocking omission, just noted as checked.

## What's solid (no action needed)

- AD-1, AD-3, AD-4, AD-5, AD-6 are all cleanly stated, traceable to specific PRD/UX facts, and enforceable by simple file/schema conventions appropriate to a solo build.
- The memlog shows a genuine prior reconciliation pass (4 gaps already found and fixed against PRD/EXPERIENCE.md/brief) — this is not a first-draft artifact, and the fixes it already made (FR-10 ERD boundary note, FR-13 assessment gate elevated to a Rule clause, AD-4's image-serving Route Handler + AD-3 exception) are all sound.
- Deferred list correctly excludes anything that would actually let two build units diverge, with the one low-severity caveat on UI styling noted above.
- Stack choices are sensible and mostly verified, including the deliberate, well-justified choice of Prisma 7.10.x over the newer-but-riskier Prisma 8.
