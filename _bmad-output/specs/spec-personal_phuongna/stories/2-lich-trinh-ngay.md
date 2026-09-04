---
title: 'Story 2: Daily Schedule (Lịch trình ngày)'
type: 'feature'
created: '2026-09-04'
status: 'done'
review_loop_iteration: 1
baseline_commit: '51cc0ef5d19822b39ef5ea9754f4430d01c50366'
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-personal_phuongna-2026-08-20/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/EXPERIENCE.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/glossary.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/stories.yaml'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There is no way yet to turn the Routine Template into an actual day's schedule — CAP-2/CAP-3 require initializing today's Task list from the current Mẫu lịch trình, editing that day's Tasks independently of the Mẫu, checking them off, and seeing the completion ratio; none of this exists yet (Story 1 only built Mẫu CRUD).

**Approach:** Add a physically separate `LichTrinhNgay`/`TaskNgay` model pair (AD-2), a single lazy-init Server Action `taoLichTrinhNgayTuMau()` triggered from the read path when today's (Asia/Ho_Chi_Minh) row is missing (AD-3 exception 2), CRUD Server Actions scoped to one day's Tasks, a check-off action, and a `/lich-trinh` screen with ◀/▶ day navigation and a completion ratio.

## Boundaries & Constraints

**Always:**
- `LichTrinhNgay` (one row per calendar day) and its `TaskNgay` rows are a Prisma model set physically separate from `MauLichTrinh`/`Task` (AD-2) — copy field values on init, never share rows/FKs across the two model sets.
- Day boundary ("hôm nay") is computed from `Asia/Ho_Chi_Minh`, never server UTC, via one shared helper used everywhere a day boundary is needed.
- Lazy init goes through exactly one Server Action, `taoLichTrinhNgayTuMau()` in `app/lich-trinh/actions.ts`, called from the `/lich-trinh` Server Component render — no other code path creates a `LichTrinhNgay` row (AD-3 exception 2).
- `TaskNgay` fields mirror `Task`: `ten`, `thoiHan`, `mucUuTien`, plus `daXong` (Boolean, default false). Check-off is one action, one click, no confirmation (EXPERIENCE.md Interaction Primitives).
- Editing a day's Tasks (add/edit/delete) never writes to `MauLichTrinh`/`Task`.
- Export `layLichTrinhNgay(ngay?: Date)` from `queries.ts` for future cross-module (dashboard) reuse (AD-1).
- ◀/▶ navigation only moves between the earliest existing `LichTrinhNgay` row and today — never past today (only today's row auto-creates).

**Ask First:** none identified — scope fits inside patterns Story 1 already established.

**Never:** the Dashboard Hôm nay hub (Story 11, spans the other 3 modules too); backfilling skipped days retroactively; editing/deleting `MauLichTrinh`/`Task` from this screen; auth/reminders/notifications.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First render of the day | no `LichTrinhNgay` row for today | Row + Tasks auto-created from current Mẫu, shown immediately | N/A |
| Mẫu is empty | no Task in `MauLichTrinh` | Today's row created with zero Tasks; empty-state prompt | N/A |
| Re-render same day | today's row already exists | No duplicate row/Tasks created | N/A |
| Check-off | toggle a Task's Đã xong | Flips immediately, ratio updates, no reload | N/A |
| View past day | ◀ to a day with an existing row | Shows that day's Tasks/ratio unchanged | N/A |
| View day with no row | viewing a day before the earliest existing row (e.g. via `?ngay=`) | Empty-state, not an error; ◀ itself stops exactly at the earliest existing row and never goes further back | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- add `LichTrinhNgay` (`id`, `ngay DateTime @unique`) + `TaskNgay` (`id`, `ten`, `thoiHan`, `mucUuTien`, `daXong Boolean @default(false)`, `lichTrinhNgayId`) -- AD-2 physical separation, appended after existing `MauLichTrinh`/`Task` (lines 22-54)
- `lib/ngayVn.ts` -- new; `layMocNgayVN(d?: Date): Date` normalizes to Asia/Ho_Chi_Minh midnight, used as the `ngay` unique key and for ◀/▶ day math
- `app/lich-trinh/model.ts` -- add `TaskNgay` type (`TaskMau` shape + `daXong`), reuse existing `MUC_UU_TIEN`/`laMucUuTien`/`laThoiHan`
- `app/lich-trinh/queries.ts` -- add `layLichTrinhNgay(ngay?: Date)` returning `{ngay, tasks, soDaXong, tongSo}`; reuse the enum-normalization pattern from `layMauLichTrinh` (lines 22-42)
- `app/lich-trinh/actions.ts` -- add `taoLichTrinhNgayTuMau()`, `themTaskNgay`, `suaTaskNgay`, `xoaTaskNgay`, `danhDauTask`; reuse `boiCanhGhi`/validation style and the already-declared `DUONG_DAN_LICH_TRINH` constant (line 27)
- `app/lich-trinh/page.tsx` -- new; Server Component at the already-anticipated route `/lich-trinh` (back-link target in `mau-lich-trinh/page.tsx:32`), calls `taoLichTrinhNgayTuMau()` then `layLichTrinhNgay()`
- `app/lich-trinh/LichTrinhNgayView.tsx` -- new Client Component; check-off + add/edit/delete for the viewed day + ◀/▶, modeled on `mau-lich-trinh/TrinhSoanThaoMau.tsx`
- `app/globals.css` -- add `.chk`/`.chk.done`, `.bar`/`.mini-progress-wrap`/`.mini-progress-label` (from `mockups/dashboard.html:99-111`), plus day-nav button styles (no mockup exists for this exact screen)
- `app/lich-trinh/queries.test.ts` -- add tests for `layLichTrinhNgay` (ratio calc, ordering, no-row day)
- `app/lich-trinh/actions.test.ts` -- add tests for `taoLichTrinhNgayTuMau` (idempotent, copies current Mẫu) and `danhDauTask` (ownership-scoped)

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` + migration -- add `LichTrinhNgay`/`TaskNgay` -- CAP-2 data shape, AD-2
- [x] `lib/ngayVn.ts` -- VN-timezone day-boundary helper -- AD-3 exception 2 ("hôm nay" per Asia/Ho_Chi_Minh)
- [x] `app/lich-trinh/actions.ts`: `taoLichTrinhNgayTuMau()` -- upsert-by-`ngay`, copy current Mẫu Tasks in -- AD-3 exception 2
- [x] `app/lich-trinh/actions.ts`: `themTaskNgay`/`suaTaskNgay`/`xoaTaskNgay`/`danhDauTask` -- ownership-scoped by `lichTrinhNgayId`, `{ok,data}|{ok,error}` -- CAP-2/CAP-3
- [x] `app/lich-trinh/queries.ts`: `layLichTrinhNgay(ngay?)` -- read + ratio -- AD-1, CAP-3
- [x] `app/lich-trinh/page.tsx` + `LichTrinhNgayView.tsx` -- screen with check-off, day nav, ratio -- CAP-2/CAP-3 UI
- [x] `app/globals.css` -- port `.chk`/`.bar` styles -- visual parity with `dashboard.html` mockup
- [x] unit tests -- cover every I/O matrix row above

**Acceptance Criteria:**
- Given no row exists for today, when `/lich-trinh` renders, then today's Tasks appear pre-filled from the current Mẫu without a second visit.
- Given today's row already exists, when the page re-renders, then no duplicate Tasks are created.
- Given a Task on the viewed day, when checked off, then it flips immediately and the ratio updates without a page reload.
- Given a past day with an existing row, when navigated to via ◀, then its Tasks and ratio show exactly as when they were created.
- Given the Mẫu lịch trình is edited after today's row was created, when today's schedule is viewed, then it is unaffected (already-copied Tasks stand).

## Spec Change Log

- **Finding:** review_loop_iteration 1 (blind-hunter + verification-gap) — the frozen Boundaries line ("◀/▶ navigation only moves between the earliest existing row and today") and the frozen I/O Matrix row ("◀ past the earliest existing row → Empty-state") + the Manual checks note ("use ◀ to confirm the empty-state") contradicted each other: Boundaries implies ◀ stops exactly at the earliest row, Matrix/Manual implied ◀ must go one step further to demonstrate the empty-state.
  **Amended:** the Matrix row and Manual checks wording, to say the empty-state is reached by viewing a day before the earliest row directly (e.g. `?ngay=`), while ◀ itself stops exactly at the earliest existing row.
  **Known-bad state avoided:** silently picking one reading and shipping code the human never actually confirmed for a frozen-intent contradiction.
  **Human decision:** keep the already-implemented behavior (◀ disabled exactly at the earliest row); the empty-state matrix scenario is verified via direct navigation, not via the ◀ control.
  **KEEP:** `coTheLui`/`coTheToi`/`laHomNay` in `app/lich-trinh/page.tsx` as implemented — do not change this boundary logic in any future pass on this story.

## Design Notes

No dedicated mockup exists for this screen (only Dashboard/Routine-Template/Meal-Picker/Quick-Transaction were mocked) — build it from EXPERIENCE.md's `task-row`/`chk`/mini-progress text spec plus `mockups/dashboard.html`'s CSS for those components, not a pixel mockup. The day-task model is named `TaskNgay`, not `Task`, since `Task` already names the Mẫu's model and AD-2 requires two physically separate tables.

## Verification

**Commands:**
- `npx prisma migrate dev` -- expected: creates `LichTrinhNgay`/`TaskNgay` tables, no errors
- `npm test` -- expected: all unit tests pass
- `npm run build` -- expected: production build succeeds, no type errors

**Manual checks:**
- Open `/lich-trinh` fresh: today's Tasks appear from the Mẫu; check one off and confirm the ratio updates; edit the Mẫu afterward and confirm today's view is unaffected; confirm ◀ is disabled exactly at the earliest existing day (no further-back link is ever rendered), and visit `?ngay=` one day earlier directly to confirm the empty-state renders without error.

## Suggested Review Order

**Day-boundary math (AD-3 exception 2) — the entry point**

- Single source of truth for "hôm nay": every day-boundary decision in this story (init, read, nav) funnels through this.
  [`ngayVn.ts:38`](../../../../lib/ngayVn.ts#L38)

- `?ngay=` query-param parser — rejects malformed and calendar-rolling-invalid dates (`"2026-02-30"`) instead of silently normalizing them.
  [`ngayVn.ts:65`](../../../../lib/ngayVn.ts#L65)

**Lazy init — the one write on the read path (AD-3 exception 2)**

- The sole place a `LichTrinhNgay` row is ever created; a `findUnique` short-circuit keeps re-renders from re-reading the Mẫu.
  [`actions.ts:222`](../../../../app/lich-trinh/actions.ts#L222)

- Atomic `upsert` on the `ngay` unique key — two near-simultaneous first-visits of the day can't create two rows.
  [`actions.ts:226`](../../../../app/lich-trinh/actions.ts#L226)

**Ownership-scoped writes (AD-1) — same discipline Story 1 used for `mauLichTrinhId`**

- Check-off: the one-click action a Task's row exposes; scoped by `id` + `lichTrinhNgayId` in the query itself.
  [`actions.ts:371`](../../../../app/lich-trinh/actions.ts#L371)

- Edit: the post-update read is now scoped by both fields too, so a concurrently-deleted Task can't return a fabricated `daXong`.
  [`actions.ts:299`](../../../../app/lich-trinh/actions.ts#L299)
  [`actions.ts:324`](../../../../app/lich-trinh/actions.ts#L324)

**Data model (AD-2) — physically separate from Story 1's tables**

- `LichTrinhNgay` — one row per calendar day, keyed by the VN-normalized `ngay`, never updated once past days.
  [`schema.prisma:61`](../../../../prisma/schema.prisma#L61)

- `TaskNgay` — a distinct table from `Task`, so Mẫu edits can never reach a day already generated.
  [`schema.prisma:74`](../../../../prisma/schema.prisma#L74)

**Read path (AD-1) — the only way another module may query this data**

- `layLichTrinhNgay()` — pure read, never creates a row; returns the `tonTai` flag the UI uses to tell "empty day" apart from "no day at all".
  [`queries.ts:67`](../../../../app/lich-trinh/queries.ts#L67)

- `layNgaySomNhat()` — the ◀ lower bound; nothing before this day was ever visited.
  [`queries.ts:109`](../../../../app/lich-trinh/queries.ts#L109)

**Day navigation — the resolved Boundaries/Matrix ambiguity (see Spec Change Log)**

- Server-side clamp on `?ngay=` — closes the loophole a hand-edited URL would otherwise have around the nav bounds.
  [`page.tsx:53`](../../../../app/lich-trinh/page.tsx#L53)

- `coTheLui`/`coTheToi` — ◀ stops exactly at the earliest existing row by design; confirmed with the human, not inferred.
  [`page.tsx:63`](../../../../app/lich-trinh/page.tsx#L63)

**UI (CAP-2/CAP-3)**

- Check-off handler — the "ghi nhanh" interaction the whole story exists to support.
  [`LichTrinhNgayView.tsx:92`](../../../../app/lich-trinh/LichTrinhNgayView.tsx#L92)

- The circular `chk` checkbox styling ported from the Dashboard mockup, remapped onto this project's CSS tokens.
  [`LichTrinhNgayView.tsx:224`](../../../../app/lich-trinh/LichTrinhNgayView.tsx#L224)

**Peripherals**

- Day-math unit tests — hardcoded, independently-computed expectations (not derived by calling the function under test).
  [`ngayVn.test.ts:1`](../../../../lib/ngayVn.test.ts#L1)

- Read-path tests — no-row day, ratio calc, past-day isolation.
  [`queries.test.ts:119`](../../../../app/lich-trinh/queries.test.ts#L119)

- Write-path tests — idempotent init, ownership scoping, the concurrent-delete case.
  [`actions.test.ts:304`](../../../../app/lich-trinh/actions.test.ts#L304)
