---
title: 'Story 8: Ghi buổi học (Study Session Logging)'
type: 'feature'
created: '2026-09-13'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'd593841d353c0fd140e369374d65ae77bdeb988b'
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-personal_phuongna-2026-08-20/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/EXPERIENCE.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/glossary.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/stories.yaml'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Module Học tập doesn't exist yet — there is no way to log a Buổi học (study session) for either Kỹ năng (Tiếng Anh or Automation Test), so nothing accumulates toward either skill's tracked progress.

**Approach:** Stand up `Module Học tập` (new, first module of its kind) with a single standalone `/hoc-tap` screen showing two independent log forms, one per Kỹ năng — no picker needed, which form is submitted implies the Kỹ năng (mirror Story 7's two-independent-columns pattern). This story covers CAP-11 (ghi) only: `KyNang` is a fixed 2-value app-layer enum (mirror `MUC_UU_TIEN`/`BUOI`), not its own Prisma model. Viewing any total/lịch sử/streak (CAP-12, Story 9) and `LoTrinh`/`Moc`/`BaiTestDanhGia` (CAP-13, Story 10) are explicitly out of scope — SPEC.md itself splits "ghi" from "xem" the same way Story 3 (ghi Giao dịch) and Story 5 (xem báo cáo) were split apart.

## Boundaries & Constraints

**Always:**
- `KyNang` is validated as one of exactly two fixed strings (`"TiengAnh"`, `"AutomationTest"`) at the application layer — never its own Prisma model/table (SQLite has no enum type; mirror `MUC_UU_TIEN`/`BUOI`/`loai`'s established String-enum pattern).
- `BuoiHoc.ngay` is always stamped to today via `layMocNgayVN()` at creation time — no user-editable date field (Buổi học is one of the app's three "ghi nhanh" quick-log actions per EXPERIENCE.md's NFR constraint: log-now, no backdating UI).
- Saving a Buổi học is one click, no second confirmation step (mirror the app-wide ghi-nhanh convention already used for Task check-off and Giao dịch); on success show a lightweight inline confirmation (e.g. "Đã lưu ✓") — never a running total, that belongs to Story 9.
- Server Actions return `KetQua<T>` (`lib/ketQua.ts`), wrapped in a `boiCanhGhi()`-style try/catch, same shape as every other module.
- `thoiLuongPhut` is a positive `Int`, capped at Prisma's 32-bit signed max (mirror `SO_TIEN_TOI_DA` in `app/chi-tieu/actions.ts` — a hard overflow guard, not an invented "realistic session length" business rule).
- Logging a session for one Kỹ năng never reads or writes anything scoped to the other Kỹ năng.

**Ask First:** none — the exact form layout (stacked vs. side-by-side) is ordinary UI implementation, not a decision needing a human gate.

**Never:** no running total / tổng thời lượng display, lịch sử list, streak, or time chart anywhere in this story (CAP-12, Story 9's scope — deferred, see `deferred-work.md`); no `LoTrinh`/`Moc`/`BaiTestDanhGia` models or roadmap UI (Story 10's scope); no dashboard integration (Story 11 doesn't exist yet).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Log a session for Tiếng Anh | nội dung + thời lượng, submit on that form | Row created with `kyNang: "TiengAnh"`, `ngay` = today; inline "Đã lưu ✓" confirmation; form clears for the next entry | N/A |
| Log a session for Automation Test | nội dung + thời lượng, submit on that form | Row created with `kyNang: "AutomationTest"`; independent of the Tiếng Anh form's state | N/A |
| Empty nội dung | whitespace-only or empty string | Rejected, field-level error, no row created | `NOI_DUNG_TRONG` |
| Thời lượng zero or negative | `thoiLuongPhut <= 0` | Rejected, field-level error, no row created | `THOI_LUONG_KHONG_HOP_LE` |
| Thời lượng exceeds Int32 max | value beyond 2,147,483,647 | Rejected before touching Prisma | `THOI_LUONG_KHONG_HOP_LE` |
| Log twice in a row for the same Kỹ năng | two submits, same form | Two independent rows persisted, neither overwrites the other | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- add a new "Module Học tập" section with `BuoiHoc { id, kyNang String, noiDung String, thoiLuongPhut Int, ngay DateTime, @@index([kyNang]) }`, appended after the existing "Module Thực đơn" section (`schema.prisma:158-260`)
- `app/chi-tieu/actions.ts` (`:36-38` for `SO_TIEN_TOI_DA`'s exact rationale/value to mirror) and `app/thuc-don/model.ts` (`BUOI`/`laBuoi()` pattern) -- reuse pattern (not code) for `KY_NANG`/`laKyNang()` in the new module
- `lib/ngayVn.ts` -- reuse `layMocNgayVN()` as-is for `BuoiHoc.ngay` (no changes)
- `lib/ketQua.ts` -- reuse `KetQua<T>`/`thanhCong`/`thatBai` as-is
- `app/hoc-tap/model.ts` (NEW) -- `KY_NANG = ["TiengAnh", "AutomationTest"] as const`, `KyNangEnum` type, `laKyNang()`, `NHAN_KY_NANG` label constants ("Tiếng Anh" / "Automation Test"), `BuoiHocDaGhi` type
- `app/hoc-tap/actions.ts` (NEW) -- `ghiBuoiHoc(duLieu: unknown): Promise<KetQua<BuoiHocDaGhi>>`, mirroring `themGiaoDich()`'s validate-then-create shape (`app/chi-tieu/actions.ts:270-287`) and its `boiCanhGhi()`/`lamMoiManHinh()` local-helper convention
- `app/hoc-tap/page.tsx` (NEW) -- Server Component, `force-dynamic`, no query needed yet (nothing to read back in this story), renders `HocTapView` -- mirror `app/chi-tieu/page.tsx`'s standalone-page shape (no dashboard hub exists yet)
- `app/hoc-tap/HocTapView.tsx` (NEW) -- Client Component: two `KyNangForm` instances (one per fixed Kỹ năng, mirroring Story 7's independent-column pattern), each an inline `nội dung`/`thời lượng` form calling `ghiBuoiHoc()`, own `useTransition()` per form, clears + shows "Đã lưu ✓" on success
- `app/globals.css` -- new "Module Học tập" section reusing existing card/form tokens; no new component classes expected beyond what a plain form/card already covers
- `app/hoc-tap/actions.test.ts` (NEW) -- cover every I/O matrix row above, following `app/thuc-don/actions.test.ts`'s location/naming/mocking convention

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` -- add `BuoiHoc` model + run migration
- [x] `app/hoc-tap/model.ts` -- `KY_NANG` enum + label constants + types
- [x] `app/hoc-tap/actions.ts` -- `ghiBuoiHoc()`
- [x] `app/hoc-tap/page.tsx` -- standalone page
- [x] `app/hoc-tap/HocTapView.tsx` -- two independent log forms
- [x] `app/globals.css` -- Module Học tập styles (reuse existing tokens)
- [x] unit tests -- cover every I/O matrix row above

**Acceptance Criteria:**
- Given no other module's code, when grepped for `BuoiHoc`, then only `app/hoc-tap/**` and `prisma/schema.prisma` reference it (AD-1 compliance).
- Given a session logged for one Kỹ năng, when checked against the database, then exactly one new `BuoiHoc` row exists with the correct `kyNang`/`noiDung`/`thoiLuongPhut`/`ngay` — no row for the other Kỹ năng was touched.
- Given the save button on a form, when clicked with valid input, then the row is persisted with no second confirmation step in between, and the form is ready for the next entry.

## Verification

**Commands:**
- `npm test` -- all pass, including new `app/hoc-tap/actions.test.ts`
- `npm run build` -- succeeds, no type errors

**Manual checks:**
- On `/hoc-tap`: log a 30-minute Tiếng Anh session with some nội dung text; confirm "Đã lưu ✓" appears and the form clears. Log an Automation Test session; confirm it's independent (no interaction with the Tiếng Anh form's state). Try submitting with empty nội dung or zero thời lượng on either form; confirm both are rejected with a clear inline message and no row is created.

## Suggested Review Order

**Data model — the new module**

- `BuoiHoc` — `kyNang` (fixed 2-value String enum, not its own table), `noiDung`, `thoiLuongPhut`, `ngay`.
  [`schema.prisma:271`](../../../../prisma/schema.prisma#L271)

- `KY_NANG` / `laKyNang()` / `NHAN_KY_NANG` — shared enum + label constants, mirroring `BUOI`/`MUC_UU_TIEN`'s pattern.
  [`model.ts:13`](../../../../app/hoc-tap/model.ts#L13)

**Server Action — validation and the write**

- `kiemTraBuoiHoc()` — validates `kyNang`/`noiDung`/`thoiLuongPhut` before touching Prisma, same field-level error shape as every other module.
  [`actions.ts:67`](../../../../app/hoc-tap/actions.ts#L67)

- `ghiBuoiHoc()` — stamps `ngay` via `layMocNgayVN()` server-side only, creates one independent `BuoiHoc` row per call.
  [`actions.ts:151`](../../../../app/hoc-tap/actions.ts#L151)

- `dinhDangBuoiHoc()` — read-side formatting; the review-flagged silent `kyNang` fallback lives here (deferred, unreachable via the only writer).
  [`actions.ts:134`](../../../../app/hoc-tap/actions.ts#L134)

**Review-caught fixes — UX polish**

- Per-Kỹ-năng placeholder text instead of one hard-coded example shared by both forms.
  [`HocTapView.tsx:104`](../../../../app/hoc-tap/HocTapView.tsx#L104)

- `THOI_LUONG_KHONG_HOP_LE`'s message no longer leaks the raw Int32 cap to the user.
  [`actions.ts:105`](../../../../app/hoc-tap/actions.ts#L105)

**UI — two independent log forms**

- `HocTapView` / `KyNangForm` — one form per fixed Kỹ năng, own `useTransition`, own error state, `maxLength={500}` on nội dung.
  [`HocTapView.tsx:33`](../../../../app/hoc-tap/HocTapView.tsx#L33)

**Peripherals**

- Full I/O matrix coverage plus the missing-key payload test added in review.
  [`actions.test.ts`](../../../../app/hoc-tap/actions.test.ts)

- `.unit-label` — dedicated class for the "phút" unit, no longer borrowing Chi tiêu's `.cur`.
  [`globals.css:1179`](../../../../app/globals.css#L1179)

