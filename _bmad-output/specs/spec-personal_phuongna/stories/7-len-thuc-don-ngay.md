---
title: 'Story 7: Lên thực đơn ngày (Daily Menu Assignment)'
type: 'feature'
created: '2026-09-12'
status: 'done'
review_loop_iteration: 0
baseline_commit: '868a2dc997d44f38b19c278c7ab275772293f072'
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-personal_phuongna-2026-08-20/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/EXPERIENCE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/mockups/meal-picker.html'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/glossary.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/stories.yaml'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Ngân hàng món ăn (Story 6) holds dish data but nothing lets it be used yet — there is no Thực đơn ngày (daily menu), so Món ăn can't be assigned to a day's meals.

**Approach:** Extend the existing `/thuc-don/chon-mon` screen (per the mock's single combined layout and EXPERIENCE.md's inferred address) with a day-scoped "Gán món cho Thực đơn ngày" assign-grid below the dish bank: two independent columns, one per Nhóm khẩu phần ("Người lớn & bé 4 tuổi" and "Bé dưới 1 tuổi"), each with the same fixed 3 bữa (Sáng/Trưa/Tối, per SPEC.md CAP-9 — the mock's extra baby "Phụ" slot is illustrative, not in SPEC.md, and is not built). Each meal slot holds exactly one Món ăn (multi-dish-per-slot deferred, see `deferred-work.md`). The adjustment-note field (CAP-10) exists only on the "Người lớn & bé 4 tuổi" column.

## Boundaries & Constraints

**Always:**
- The two Nhóm khẩu phần are physically independent — separate Prisma models, never a shared table with a discriminator/branch column (Structural Seed, ARCHITECTURE-SPINE.md).
- `ghiChu` (adjustment note) exists as a column only on the "Người lớn & bé 4 tuổi" model; the "Bé dưới 1 tuổi" model has no such column at all — not a shared-then-hidden field (FR-10, Structural Seed).
- Exactly one Món ăn per (ngày, bữa, Nhóm khẩu phần) slot — assigning a new dish to an already-filled slot replaces it, never adds a second row (multi-dish deferred).
- Assigning/clearing a slot or editing a note never creates, updates, or reads any `GiaoDich`/`DanhMucChiTieu`/`NganSach` row — module Thực đơn owns its models exclusively and never touches Chi tiêu's (AD-1, CAP-9 success criterion).
- Day scoping mirrors `app/lich-trinh/page.tsx`'s existing pattern exactly: `?ngay=yyyy-mm-dd` query param, `layMocNgayVN()`/`thamSoNgayVN()`/`tuThamSoNgay()` from `lib/ngayVn.ts`, ◀/▶ prev/next-day links, out-of-range input clamped the same way.
- Server Actions return `KetQua<T>` (`lib/ketQua.ts`), wrapped in a `boiCanhGhi()`-style try/catch, same shape as every other module.
- Deleting a Món ăn referenced by any saved Thực đơn slot is blocked (`onDelete: Restrict`), mirroring `GiaoDich`/`NganSach`'s `DanhMucChiTieu` relation — never a silent cascade that erases past menu history.
- Reuse the existing dish bank grid/data as-is (Story 6) — do not duplicate `layDanhSachMonAn()`.

**Ask First:** none — the slot picker's exact control (native `<select>` vs. custom dropdown) is ordinary UI implementation, not a decision needing a human gate.

**Never:** multiple Món ăn per meal slot (deferred — see `deferred-work.md`); no dashboard integration (Story 11 doesn't exist yet); no new upload/photo logic (reuse `MonAn.anh` as-is, read-only); no template/"Mẫu thực đơn" concept — every day's menu is entered fresh, there is nothing to copy from (unlike `MauLichTrinh`/`Task`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First visit to a day, no menu yet | empty `ThucDonNguoiLon`/`ThucDonBe` for that `ngay` | All 6 meal slots (3 per column) render as "Chưa chọn món" | N/A |
| Assign a dish to an empty slot | pick 1 Món ăn for Sáng, Người lớn column | Slot shows the dish name; row persisted; other slots unaffected | N/A |
| Replace a slot's dish | pick a different Món ăn for an already-filled slot | Old row's `monAnId` updated (or row replaced) to the new dish; still exactly one row for that slot | N/A |
| Add a note to a slot | type text in the Người lớn column's note field, save | Note persisted on that slot's row; reload shows it | N/A |
| Leave a note empty | save a slot with no note text | `ghiChu` saves as `null`; save succeeds (FR-10: always optional) | N/A |
| Bé dưới 1 tuổi column | any interaction on this column | No note field rendered at all (not just hidden); saving works identically to Người lớn minus the note | N/A |
| Navigate to a different day | click ▶/◀ or edit `?ngay=` | Each day's 6 slots are independent; a past day's assignment is never overwritten by today's edits | N/A |
| Clear a slot | unassign a previously-assigned Món ăn | Its row is deleted; slot returns to "Chưa chọn món" | N/A |
| Delete a Món ăn used in a saved menu (Story 6's delete action) | dish referenced by a `ThucDonNguoiLon`/`ThucDonBe` row | Delete rejected with a field-level error, dish stays in the bank and in the menu | `LOI_HE_THONG` (Restrict FK violation surfaces through the existing `boiCanhGhi()` catch-all, no new error code needed) |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- add `ThucDonNguoiLon { id, ngay DateTime, buoi String, monAnId, monAn @relation(onDelete: Restrict), ghiChu String?, @@unique([ngay,buoi]), @@index([monAnId]) }` and `ThucDonBe` (same shape, no `ghiChu`), appended to the existing "Module Thực đơn" schema section (`schema.prisma:158-197`)
- `app/thuc-don/model.ts` (`:1-47`) -- add `BUOI = ["Sang","Trua","Toi"] as const` + `BuoiEnum` type (mirror `MUC_UU_TIEN` pattern in `app/lich-trinh/model.ts`); add label constants for the two Nhóm khẩu phần headings ("Người lớn & bé 4 tuổi" / "Bé dưới 1 tuổi")
- `app/thuc-don/queries.ts` (`:1-40`, reuse `layDanhSachMonAn()` at `:19` for the dropdown source) -- add `layThucDonNgay(ngay: Date)` returning both columns' 3 slots each (dish + note where applicable) in one shape the view can render directly
- `app/thuc-don/actions.ts` (`:1-50` for `boiCanhGhi`/`lamMoiManHinh`/`DUONG_DAN_MAN_HINH` conventions to reuse) -- add `luuThucDonNguoiLon(ngay, buoi, monAnId, ghiChu)` and `luuThucDonBe(ngay, buoi, monAnId)` (each an upsert on `@@unique([ngay,buoi])`), plus `xoaThucDonNguoiLon(ngay, buoi)` / `xoaThucDonBe(ngay, buoi)` to clear a slot
- `lib/ngayVn.ts` -- reuse `layMocNgayVN()`, `thamSoNgayVN()`, `tuThamSoNgay()`, `themNgay()` as-is (no changes)
- `app/lich-trinh/page.tsx` (`:37-72`) -- reuse pattern (not code) for `searchParams: Promise<{ ngay?: string }>` parsing + clamping + ◀/▶ link construction
- `app/thuc-don/chon-mon/page.tsx` (`:1-55`, existing) -- add `searchParams` param for `?ngay=`, call `layThucDonNgay()`, pass result + day-nav links to the view
- `app/thuc-don/chon-mon/NganHangMonAnView.tsx` (existing, reuse dish list/types) -- add a new section/child component for the assign-grid (two `assign-col`s, `meal-slot` rows each with one dish dropdown, note input for the Người lớn column only), calling the new Server Actions
- `app/globals.css` -- add `.assign-grid`/`.assign-col`/`.meal-slot`/`.meal-time`/`.note-input` styles per the mock, reusing existing tokens (`--accent`, `--surface`, `--border`)
- `app/thuc-don/actions.test.ts`, `app/thuc-don/queries.test.ts` (existing files, extend) -- cover every I/O matrix row above

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` -- add `ThucDonNguoiLon`/`ThucDonBe` models + run migration
- [x] `app/thuc-don/model.ts` -- `BUOI` enum + Nhóm khẩu phần label constants
- [x] `app/thuc-don/queries.ts` -- `layThucDonNgay(ngay)`
- [x] `app/thuc-don/actions.ts` -- `luuThucDonNguoiLon`, `xoaThucDonNguoiLon`, `luuThucDonBe`, `xoaThucDonBe`
- [x] `app/thuc-don/chon-mon/page.tsx` -- `?ngay=` handling + day-nav links + wire new query
- [x] `app/thuc-don/chon-mon/NganHangMonAnView.tsx` -- assign-grid UI (two columns, per-slot dropdown, note input)
- [x] `app/globals.css` -- assign-grid component styles
- [x] unit tests -- cover every I/O matrix row above

**Acceptance Criteria:**
- Given no other module's code, when grepped for `ThucDonNguoiLon`/`ThucDonBe`, then only `app/thuc-don/**` and `prisma/schema.prisma` reference them (AD-1 compliance).
- Given a day with an assigned menu, when navigating away and back via `?ngay=`, then the same assignments and note render unchanged, and no `GiaoDich` row exists anywhere in the DB as a result.
- Given the "Bé dưới 1 tuổi" column, when inspecting its rendered DOM, then no note input element exists for it at all (structural absence, not `display:none`/disabled).

## Verification

**Commands:**
- `npm test` -- all pass, including new/extended `app/thuc-don/*.test.ts`
- `npm run build` -- succeeds, no type errors

**Manual checks:**
- On `/thuc-don/chon-mon?ngay=2026-09-12`: assign a dish to Trưa for "Người lớn & bé 4 tuổi", add a note, save; reload and confirm both persist. Assign a dish to Sáng for "Bé dưới 1 tuổi"; confirm no note field appears in that column. Navigate to the next day via ▶; confirm its slots are empty (independent from the previous day). Try deleting a Món ăn used in today's menu from the dish bank; confirm it's rejected with a clear message.

## Suggested Review Order

**Data model — the two independent branches (Structural Seed)**

- `ThucDonNguoiLon` — has `ghiChu`, `@@unique([ngay, buoi])`, `monAnId` FK `onDelete: Restrict`.
  [`schema.prisma:218`](../../../../prisma/schema.prisma#L218)

- `ThucDonBe` — same shape, structurally has NO `ghiChu` column at all (not shared-then-hidden).
  [`schema.prisma:247`](../../../../prisma/schema.prisma#L247)

**Server Actions — validation and the atomic per-slot upsert**

- `luuThucDonNguoiLon()` — validates then `upsert`s on the `(ngay, buoi)` key, one row per slot, never a second row on replace.
  [`actions.ts:570`](../../../../app/thuc-don/actions.ts#L570)

- `luuThucDonBe()` — same shape, no `ghiChu` parameter at all (Structural Seed compliance).
  [`actions.ts:640`](../../../../app/thuc-don/actions.ts#L640)

- `kiemTraNgayThamSo()` / `kiemTraBuoiThamSo()` / `kiemTraGhiChuThamSo()` — shared validators used by both branches.
  [`actions.ts:503`](../../../../app/thuc-don/actions.ts#L503)

- `xacNhanMonAnTonTai()` — confirms the Món ăn still exists before assigning, surfacing a field-level error instead of a raw FK failure.
  [`actions.ts:547`](../../../../app/thuc-don/actions.ts#L547)

**Review-caught fix — ghi chú no longer carries over onto a newly chosen dish**

- Switching a slot's dish now passes `ghiChu: null` explicitly instead of resupplying the previous dish's note.
  [`NganHangMonAnView.tsx:663`](../../../../app/thuc-don/chon-mon/NganHangMonAnView.tsx#L663)

**Queries — day-scoped read**

- `layThucDonNgay()` — reads both branches' 3 slots each for one `ngay`, normalized through `layMocNgayVN()`.
  [`queries.ts:60`](../../../../app/thuc-don/queries.ts#L60)

**UI — day-nav wiring and the assign-grid**

- `TrangChonMon()` — `?ngay=` handling mirrors `app/lich-trinh/page.tsx` exactly, wires `layThucDonNgay()`.
  [`page.tsx:43`](../../../../app/thuc-don/chon-mon/page.tsx#L43)

- `GanThucDonNgayView` — now a proper landmark `<section>`, two independent columns, day-nav.
  [`NganHangMonAnView.tsx:506`](../../../../app/thuc-don/chon-mon/NganHangMonAnView.tsx#L506)

- `NguoiLonSlot` / `BeSlot` — per-slot `useTransition`, note input only exists in `NguoiLonSlot`'s JSX (structural absence in `BeSlot`, not hidden).
  [`NganHangMonAnView.tsx:642`](../../../../app/thuc-don/chon-mon/NganHangMonAnView.tsx#L642)

**Peripherals**

- `BUOI` / `laBuoi()` / `NHOM_KHAU_PHAN` — shared enum + label constants, mirroring `MUC_UU_TIEN`'s pattern.
  [`model.ts:56`](../../../../app/thuc-don/model.ts#L56)

- Full I/O matrix coverage plus the 200-char ghi chú boundary and both branches' validation/delete paths.
  [`actions.test.ts`](../../../../app/thuc-don/actions.test.ts)

- Assign-grid component styles reusing existing tokens.
  [`globals.css:1024`](../../../../app/globals.css#L1024)

