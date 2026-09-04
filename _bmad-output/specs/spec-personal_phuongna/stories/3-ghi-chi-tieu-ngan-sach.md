---
title: 'Story 3: Log Transactions (Ghi chi tiêu)'
type: 'feature'
created: '2026-09-04'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'bfb574c79d4b015d6ff8d90a5baae30749e6004e'
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-personal_phuongna-2026-08-20/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/EXPERIENCE.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/glossary.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/stories.yaml'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There is no way yet to log a Giao dịch (Chi/Thu) — CAP-4 requires it, and it's the third of 4 sibling modules (AD-1); none of `chi-tieu` exists yet.

**Approach:** Add a new `chi-tieu` module: `DanhMucChiTieu` (category, create-only in this story) and `GiaoDich` Prisma models, Server Actions for Giao dịch CRUD plus category creation, and one screen (`/chi-tieu`) for quick-adding a transaction and viewing/editing this month's log — following the module shape Story 1/2 already established under `app/lich-trinh/`.

## Boundaries & Constraints

**Always:**
- `DanhMucChiTieu`/`GiaoDich` are this module's exclusive Prisma models (AD-1) — export read functions from `queries.ts` for future dashboard reuse, never let another module import them directly.
- `soTien` is always a positive `Int`; Chi/Thu direction is the `loai` enum column, never a signed amount (SPEC.md Data & formats convention).
- `danhMucChiTieuId` is required when `loai === "Chi"`, absent/null when `loai === "Thu"` — one shared validator, mirroring `kiemTraTask()` (`app/lich-trinh/actions.ts:75-112`).
- All writes go through Server Actions returning `{ok:true,data}|{ok:false,error:{code,message,field?}}` via a `boiCanhGhi()`-style wrapper; no `app/api/**` route (AD-3).
- No delete-confirmation dialog (EXPERIENCE.md Interaction Primitives).
- Reuse existing CSS (`.card`, `.btn`, `.ghost`, `.seg`/`.seg-btn`, `.field`, `.input`, `.field-error`) before porting new classes.

**Ask First:** none identified — direct continuation of Story 1/2's patterns.

**Never:** no Danh mục rename/delete, no Ngân sách/budget model or screen (CAP-5 — deferred, see `deferred-work.md`); no alert/threshold logic (CAP-6); no past-month report (CAP-7); no dashboard/hub (Story 11) — `/chi-tieu` is standalone, not an overlay sheet; no linkage to other modules' tables.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Add Chi | loai=Chi, soTien>0, danhMục (create inline if none exist yet), ngày, ghi chú optional | Saved, appears immediately in this month's list | Missing danhMục or empty tên-when-creating blocked inline |
| Add Thu | loai=Thu, soTien>0 | Saved, no category field shown/persisted | N/A |
| Edit/Delete Giao dịch | change amount, or delete a row | Updates/removes in place, month's total recomputes | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- append `DanhMucChiTieu` (`id`, `ten`) and `GiaoDich` (`id`, `loai`, `soTien`, `ngay`, `ghiChu String?`, `danhMucChiTieuId Int?`, `onDelete: Restrict`) after `TaskNgay` (line 76), same id/index conventions
- `lib/db.ts` -- reuse unchanged
- `app/chi-tieu/model.ts` -- new; mirror `app/lich-trinh/model.ts:9-35`: `LOAI_GIAO_DICH` const array, `laLoaiGiaoDich()` guard, data shapes
- `app/chi-tieu/actions.ts` -- new; `themGiaoDich`, `suaGiaoDich`, `xoaGiaoDich`, `themDanhMuc` -- reuse `boiCanhGhi()` + ownership-scoped `updateMany`/`deleteMany` pattern (`app/lich-trinh/actions.ts:55-64,158-204`)
- `app/chi-tieu/queries.ts` -- new; `layGiaoDichThangHienTai()`, `layDanhSachDanhMuc()` -- AD-1 export pattern (`app/lich-trinh/queries.ts:5-12`)
- `app/chi-tieu/page.tsx` -- new Server Component, `dynamic = "force-dynamic"` (pattern: `app/lich-trinh/page.tsx:23`); renders `<ChiTieuView/>`
- `app/chi-tieu/ChiTieuView.tsx` -- new Client Component; quick-add form + inline category-create + inline edit/delete list, modeled on `LichTrinhNgayView.tsx`'s `useTransition` pattern
- `app/globals.css` -- port `.amount-field`, `.cat-chip`/`.cat-wrap`, `.date-field`, `.note-field`, `.field-label` from `mockups/quick-transaction.html:131-147` (inline, not overlay — see Design Notes)
- `app/chi-tieu/actions.test.ts`, `app/chi-tieu/queries.test.ts` -- new; vitest, `@/lib/db` mocked per `app/lich-trinh/actions.test.ts:1-45`

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` + migration -- add `DanhMucChiTieu`/`GiaoDich` -- CAP-4 data shape
- [x] `app/chi-tieu/model.ts` -- `loai` enum + type guard + data shapes
- [x] `app/chi-tieu/actions.ts` -- Giao dịch CRUD + `themDanhMuc`
- [x] `app/chi-tieu/queries.ts` -- `layGiaoDichThangHienTai()`, `layDanhSachDanhMuc()`
- [x] `app/chi-tieu/page.tsx` + `ChiTieuView.tsx` -- quick-add + this month's list
- [x] `app/globals.css` -- port the 5 new classes listed in Code Map
- [x] unit tests -- cover every I/O matrix row above

**Acceptance Criteria:**
- Given a Chi giao dịch is added, when `/chi-tieu` re-renders, then it appears in this month's list and the month's Chi total reflects it.
- Given loai is switched from Chi to Thu mid-form, when saved, then no `danhMucChiTieuId` is persisted.
- Given no Danh mục exists yet, when a Chi is being entered, then a category can be created inline without leaving the form.

## Design Notes

No dashboard exists yet (Story 11) to host the quick-add sheet as a `.scrim`/`.sheet-modal` overlay. Per Story 2's precedent, render it inline as a `.card` on `/chi-tieu` instead — same fields/tokens, different container.

## Verification

**Commands:**
- `npx prisma migrate dev` -- expected: creates `DanhMucChiTieu`/`GiaoDich` tables, no errors
- `npm test` -- expected: all unit tests pass
- `npm run build` -- expected: production build succeeds, no type errors

**Manual checks:**
- On `/chi-tieu`: add a Chi with a newly-created-inline category, confirm it appears in the list; switch to Thu and confirm the category field disappears; edit and delete a giao dịch, confirm the month's total updates each time.

## Suggested Review Order

**Validation entry point — the single funnel every write goes through**

- `kiemTraGiaoDich()` — the one validator both `themGiaoDich`/`suaGiaoDich` call; start here to see every invariant in one place.
  [`actions.ts:82`](../../../../app/chi-tieu/actions.ts#L82)

- `soTien` bound — positive-integer check widened to also reject above Prisma's `Int` max, closing a review-caught gap.
  [`actions.ts:100`](../../../../app/chi-tieu/actions.ts#L100)

- `ghiChu` length cap — same review-caught-gap pattern as the amount bound, field-specific error.
  [`actions.ts:119`](../../../../app/chi-tieu/actions.ts#L119)

- Chi/Thu branch — `danhMucChiTieuId` is force-`null`ed on Thu even if the client sends a stale id from a Chi-mode form.
  [`actions.ts:128`](../../../../app/chi-tieu/actions.ts#L128)

- Chi branch — `danhMucChiTieuId` required, then existence-checked separately so a stale/deleted category id fails with a named field error, not a raw FK violation.
  [`actions.ts:138`](../../../../app/chi-tieu/actions.ts#L138)

**Concurrency safety — the race fix from review**

- `suaGiaoDich()` — single `prisma.giaoDich.update()` replacing an `updateMany`-then-`findUnique` pair that had a window for a concurrent delete to produce a false "not found".
  [`actions.ts:250`](../../../../app/chi-tieu/actions.ts#L250)

- P2025 duck-type catch — converts Prisma's real "record not found" into the same `KHONG_TIM_THAY_GIAO_DICH` shape every other action uses.
  [`actions.ts:228`](../../../../app/chi-tieu/actions.ts#L228)

**Data model (AD-1, AD-2 n/a here — no history/current split needed for a transaction log)**

- `DanhMucChiTieu`/`GiaoDich` — physically separate from `lich-trinh`'s models per AD-1, `onDelete: Restrict` blocks deleting a category still in use.
  [`schema.prisma:97`](../../../../prisma/schema.prisma#L97)

**Read path (AD-1) — the only way another module may query this data**

- `layGiaoDichThangHienTai()` — Chi/Thu totals summed strictly by `loai`, never by adding raw `soTien` regardless of direction.
  [`queries.ts:36`](../../../../app/chi-tieu/queries.ts#L36)

**UI — inline category creation (the bug this review caught)**

- Enter in "Tên Danh mục mới" now creates the category instead of submitting the whole transaction form.
  [`ChiTieuView.tsx:418`](../../../../app/chi-tieu/ChiTieuView.tsx#L418)

- Main form's submit blocks with an inline message if a typed-but-unconfirmed category name is still pending, instead of silently dropping it.
  [`ChiTieuView.tsx:248`](../../../../app/chi-tieu/ChiTieuView.tsx#L248)

**Month-boundary math — reused pattern from Story 2**

- `layMocDauThangVN()`/`layMocDauThangKeTiepVN()` — `[dauThang, dauThangKeTiep)` exclusive-upper-bound month filter, same VN-timezone discipline as `layMocNgayVN()`.
  [`ngayVn.ts:65`](../../../../lib/ngayVn.ts#L65)

**Peripherals**

- De-tautologized month-boundary test — hand-computed ISO timestamps instead of calling the function under test to derive its own "expected" value.
  [`ngayVn.test.ts:1`](../../../../lib/ngayVn.test.ts#L1)

- Race/boundary regression tests — P2025 case, `soTien`/length boundaries, Dec→Jan rollover through the query layer.
  [`actions.test.ts:1`](../../../../app/chi-tieu/actions.test.ts#L1)
