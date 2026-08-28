---
title: 'Story 1: Routine Template (Mẫu lịch trình)'
type: 'feature'
created: '2026-08-29'
status: 'in-progress'
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

## Tasks & Acceptance

**Execution:**
- [ ] `package.json` / `tsconfig.json` / `next.config.ts` -- scaffold a new Next.js 16.3.x + TypeScript project -- establishes the paradigm from ARCHITECTURE-SPINE.md
- [ ] `prisma/schema.prisma` -- define `MauLichTrinh` and its `Task` model (autoincrement Int id) -- CAP-1 data shape
- [ ] `lib/db.ts` -- Prisma Client singleton wired to `app-data/db.sqlite` -- AD-6
- [ ] `app/lich-trinh/actions.ts` -- `themTask`, `suaTask`, `xoaTask` Server Actions, each returning `{ok:true,data}|{ok:false,error:{code,message,field?}}` -- AD-3 consistency convention
- [ ] `app/lich-trinh/queries.ts` -- `layMauLichTrinh()` read function -- AD-1 (module owns its reads too)
- [ ] `app/lich-trinh/mau-lich-trinh/page.tsx` -- Server Component rendering the Task list + add/edit/delete UI per the mockup -- CAP-1 UI
- [ ] `.gitignore` + `git init` -- initialize version control, exclude `app-data/` -- AD-6
- [ ] unit test for `actions.ts` -- cover the empty-`ten` validation edge case from the I/O matrix

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
