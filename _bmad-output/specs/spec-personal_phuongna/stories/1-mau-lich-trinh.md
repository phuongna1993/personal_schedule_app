---
title: 'Story 1: Routine Template (Mẫu lịch trình)'
type: 'feature'
created: '2026-08-29'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'NO_VCS'
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-personal_phuongna-2026-08-20/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/EXPERIENCE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/DESIGN.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/glossary.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The project has no code yet, and there is no way to define the reusable default set of daily Tasks (Mẫu lịch trình) that every future Lịch trình ngày is generated from (SPEC.md CAP-1).

**Approach:** Scaffold the Next.js + Prisma + SQLite project per ARCHITECTURE-SPINE.md, then implement full CRUD for the Routine Template's Tasks (name, time-of-day, priority) as the first feature module.

## Boundaries & Constraints

**Always:**
- Follow ARCHITECTURE-SPINE.md exactly: Next.js App Router, Server Actions only for writes (AD-3), Prisma Client singleton over a local SQLite file at `app-data/db.sqlite` outside git (AD-6), no auth/session anywhere (AD-5).
- `MauLichTrinh` (the template) and its Tasks are a physically separate Prisma model set from `LichTrinhNgay` (AD-2) — do not create `LichTrinhNgay` in this story.
- Task fields: `ten` (string, required), `thoiHan` (time-of-day, e.g. `"20:00"`), `mucUuTien` (enum: Cao / TrungBinh / Thap).
- This module's Prisma models + Server Actions live under a `lich-trinh` module; export a `queries.ts` with read functions for future cross-module (dashboard) use, per AD-1.
- Match `EXPERIENCE.md`'s Task row pattern and `mockups/routine-template.html` visually (via `DESIGN.md` tokens): no delete-confirmation dialog, no reminders/notifications.

**Ask First:** if the actually-available Next.js/Prisma versions at install time differ from the pinned 16.3.x/Prisma 7.10.x in a breaking way, confirm with the human before adapting; introducing any UI component library (Tailwind/shadcn) — currently Deferred in the architecture spine.

**Never:** no login/auth code; no `app/api/**` route for this CRUD (Server Actions only); no other module's tables (Chi tiêu, Thực đơn, Học tập); no day-initialization logic (`LichTrinhNgay` — that is Story 2).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Add Task | valid tên + thời hạn + mức ưu tiên | New Task appears in the template list immediately | Empty `ten` blocked with an inline message |
| Edit Task | change thời hạn/mức ưu tiên on an existing Task | Task updates in place, no page reload | N/A |
| Delete Task | user deletes a Task from the template | Task removed immediately, no confirmation dialog | N/A |
| Empty template (first run) | no Tasks exist yet | Empty-state row with a one-line prompt + primary "add first Task" action | N/A |

</frozen-after-approval>

## Code Map

- `package.json`, `tsconfig.json`, `next.config.ts` -- new Next.js 16.3.x project root (greenfield, no existing code)
- `prisma/schema.prisma` -- new; defines `MauLichTrinh` + its `Task` model only (AD-1, AD-2)
- `lib/db.ts` -- new; Prisma Client singleton, the only file touching SQLite directly
- `app/lich-trinh/mau-lich-trinh/page.tsx` -- new; Routine Template editor screen — visual ground truth: `_bmad-output/planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/mockups/routine-template.html`
- `app/lich-trinh/actions.ts` -- new; Server Actions `themTask`, `suaTask`, `xoaTask` (AD-3)
- `app/lich-trinh/queries.ts` -- new; exported read function `layMauLichTrinh()` for this module (AD-1)
- `.gitignore` -- new; excludes `app-data/` (AD-6)

Additional files (not in the original Code Map, required by the above -- same list as under Tasks & Acceptance):

- `lib/duongDanDb.ts` -- new; the single source of truth for the SQLite file location, imported by both `lib/db.ts` and `prisma.config.ts` (AD-6)
- `app/lich-trinh/queries.test.ts` -- new; unit test for the read path `layMauLichTrinh()`

## Tasks & Acceptance

**Execution:**
- [x] `package.json` / `tsconfig.json` / `next.config.ts` -- scaffold a new Next.js 16.3.x + TypeScript project -- establishes the paradigm from ARCHITECTURE-SPINE.md
- [x] `prisma/schema.prisma` -- define `MauLichTrinh` and its `Task` model (autoincrement Int id) -- CAP-1 data shape
- [x] `lib/db.ts` -- Prisma Client singleton wired to `app-data/db.sqlite` -- AD-6
- [x] `app/lich-trinh/actions.ts` -- `themTask`, `suaTask`, `xoaTask` Server Actions, each returning `{ok:true,data}|{ok:false,error:{code,message,field?}}` -- AD-3 consistency convention
- [x] `app/lich-trinh/queries.ts` -- `layMauLichTrinh()` read function -- AD-1 (module owns its reads too)
- [x] `app/lich-trinh/mau-lich-trinh/page.tsx` -- Server Component rendering the Task list + add/edit/delete UI per the mockup -- CAP-1 UI
- [x] `.gitignore` + `git init` -- initialize version control, exclude `app-data/` -- AD-6
- [x] unit test for `actions.ts` -- cover the empty-`ten` validation edge case from the I/O matrix
- [x] unit test for `queries.ts` -- cover the read path: no `MauLichTrinh` row yet -> `[]`, out-of-union `mucUuTien` normalized to `TrungBinh`, ordering by `thoiHan` then `id`
- [x] `package.json` -- `predev` script running `prisma migrate deploy`, so a fresh checkout does not fail with "no such table: MauLichTrinh" on the first `npm run dev`

**Additional files (not in the original Code Map, required by the above):**
- `prisma.config.ts` -- Prisma 7 moved the datasource url out of `schema.prisma`; holds the literal `file:./app-data/db.sqlite` (AD-6: no per-environment env vars)
- `lib/ketQua.ts` -- the AD-3 `{ok,data}|{ok,error}` union, shared by every module's actions
- `app/lich-trinh/model.ts` -- pure enum/validator/type module, split out of `queries.ts` so Client Components can import `MUC_UU_TIEN` without pulling Prisma into the browser bundle
- `app/layout.tsx`, `app/globals.css`, `app/NutDoiTheme.tsx` -- root shell + DESIGN.md tokens + the mandatory manual light/dark toggle
- `app/lich-trinh/mau-lich-trinh/TrinhSoanThaoMau.tsx` -- Client Component holding the add/edit/delete interaction that calls the Server Actions
- `vitest.config.ts` -- test runner (QA strategy was Deferred in the spine); `include` matches `.test.{ts,tsx}` so a future component test cannot be silently uncollected
- `lib/duongDanDb.ts` -- single source of truth for the SQLite file location, imported by both `lib/db.ts` (runtime) and `prisma.config.ts` (CLI) so the two can never point at different files (AD-6)
- `app/lich-trinh/queries.test.ts` -- unit test for the read path `layMauLichTrinh()`

**Acceptance Criteria:**
- Given an empty template, when the user adds a Task with a name/time/priority, then it appears in the list without a page reload.
- Given an existing Task, when the user edits its time or priority, then the change persists and no other Task is affected.
- Given an existing Task, when the user deletes it, then it disappears immediately with no confirmation prompt.
- Given the app is stopped and `npm run dev` restarted, when the template screen loads, then previously-added Tasks are still present (SQLite persistence).

## Design Notes

Task's `mucUuTien` is a fixed 3-value enum (Cao/TrungBinh/Thap), not free text — matches the `badge-pri` component in `EXPERIENCE.md` which always renders both an icon/weight AND a text label (never color alone).

## Verification

**Commands:**
- `npm run dev` -- expected: starts with no errors, template page reachable at `/lich-trinh/mau-lich-trinh`
- `npx prisma migrate dev` -- expected: creates `app-data/db.sqlite` with the `MauLichTrinh`/`Task` tables, no errors
- `npm run build` -- expected: production build succeeds with no type errors

**Manual checks (if no CLI):**
- Add, edit, and delete a Task in the browser; confirm the list updates without a full page reload each time.
- Empty template (first run) matrix row: manually verified only (delete all Tasks, confirm the empty-state prompt + CTA render) — no automated component test exists yet, since no component-test infra is set up and QA strategy remains Deferred in ARCHITECTURE-SPINE.md. Revisit once that decision is made.

**Post-implementation fix:** the mockups (and this story's first implementation pass) carried an invented brand name ("MEBỖI") the human had already rejected during the UX phase. Scrubbed from `page.tsx` and all 4 `mockups/*.html` files during review — see `_bmad-output/planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/.memlog.md`.

## Suggested Review Order

**Server Actions — the write path (AD-3)**

- Entry point: every mutation funnels through this try/catch wrapper so a thrown Prisma error becomes `{ok:false}` instead of an unhandled rejection.
  [`actions.ts:52`](../../../../app/lich-trinh/actions.ts#L52)

- Runtime payload guard — Server Actions are public HTTP endpoints with types erased, so this rejects non-object/array input before any property access.
  [`actions.ts:72`](../../../../app/lich-trinh/actions.ts#L72)

- Singleton race fix — an atomic `upsert` replaces a check-then-create, so two concurrent first writes can never produce two template rows.
  [`actions.ts:122`](../../../../app/lich-trinh/actions.ts#L122)

- Ownership-scoped writes — `suaTask`/`xoaTask` now match on `{id, mauLichTrinhId}`, not bare `id`, enforcing AD-1 in the query itself.
  [`actions.ts:171`](../../../../app/lich-trinh/actions.ts#L171)

**Data model (AD-1, AD-2)**

- `MauLichTrinh` is the "config hiện hành" — a physically separate table from the not-yet-built `LichTrinhNgay`, per AD-2.
  [`schema.prisma:26`](../../../../prisma/schema.prisma#L26)

- `Task` stores `mucUuTien`/`thoiHan` as plain strings (SQLite has no enum) with the 3-value constraint enforced in application code, not the schema.
  [`schema.prisma:34`](../../../../prisma/schema.prisma#L34)

**Read path (AD-1) — the only way another module may query this data**

- `layMauLichTrinh()` is the sole read function this module exports; note the empty-DB and enum-normalization fallbacks.
  [`queries.ts:22`](../../../../app/lich-trinh/queries.ts#L22)

- Out-of-union `mucUuTien` values from a corrupted row are silently coerced back to `"TrungBinh"` rather than surfaced — a known, deferred trade-off.
  [`queries.ts:40`](../../../../app/lich-trinh/queries.ts#L40)

**Shared SQLite path (AD-6)**

- Single source of truth for the DB file location, so the Next.js runtime and the Prisma CLI can never resolve to different files.
  [`duongDanDb.ts:25`](../../../../lib/duongDanDb.ts#L25)

- `lib/db.ts` now delegates path resolution here instead of computing it locally.
  [`db.ts:20`](../../../../lib/db.ts#L20)

**UI (CAP-1)**

- Server Component entry — reads via the module's own `queries.ts`, never Prisma directly (AD-1).
  [`page.tsx:26`](../../../../app/lich-trinh/mau-lich-trinh/page.tsx#L26)

- Client-side rejection handling — a failed Server Action call now surfaces `LOI_KET_NOI` instead of failing silently.
  [`TrinhSoanThaoMau.tsx:68`](../../../../app/lich-trinh/mau-lich-trinh/TrinhSoanThaoMau.tsx#L68)

- Same pattern on the save path.
  [`TrinhSoanThaoMau.tsx:210`](../../../../app/lich-trinh/mau-lich-trinh/TrinhSoanThaoMau.tsx#L210)

**Peripherals**

- New read-path test — empty DB, enum normalization, and ordering.
  [`queries.test.ts:1`](../../../../app/lich-trinh/queries.test.ts#L1)

- Updated write-path tests — atomic upsert, ownership scoping, `LOI_HE_THONG` on a thrown error.
  [`actions.test.ts:1`](../../../../app/lich-trinh/actions.test.ts#L1)

- Widened to catch `.tsx` tests too, so a future component test is never silently uncollected.
  [`vitest.config.ts:11`](../../../../vitest.config.ts#L11)

- `predev` now runs migrations automatically, so a fresh checkout doesn't fail with "no such table".
  [`package.json:6`](../../../../package.json#L6)
