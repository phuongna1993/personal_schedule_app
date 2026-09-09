---
title: 'Story 4: Budget & 30% Threshold Alert (Ngân sách & Cảnh báo)'
type: 'feature'
created: '2026-09-10'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'c02f25d4442d8a8b7f66d58e334c56ba45c83a14'
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-personal_phuongna-2026-08-20/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/EXPERIENCE.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/glossary.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/stories.yaml'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** CAP-6's threshold alert has nothing to compare against — `NganSach` (monthly hạn mức per Danh mục) doesn't exist; CAP-5 was deferred out of Story 3 and never reassigned.

**Approach:** Add a `NganSach` model (one row per Danh mục × month, upsert-only — same physically-separate-row pattern as `LichTrinhNgay`, AD-2), a Server Action to set the current month's hạn mức, and a threshold check folded into `themGiaoDich`/`suaGiaoDich`'s response as `data.canhBaoNganSach`.

## Boundaries & Constraints

**Always:**
- `NganSach` unique per `(danhMucChiTieuId, thang)`; set/edit `upsert`s the **current** VN month only (`layMocDauThangVN()`) — never a past row (AD-2), mirroring `LichTrinhNgay`'s day-keyed upsert (`app/lich-trinh/actions.ts:236-251`).
- `hanMuc` always positive `Int` (VNĐ), same bound as `soTien` (`SO_TIEN_TOI_DA`, `actions.ts:31`).
- Threshold fixed at 30% remaining / 100% exceeded, not per-Danh-mục-configurable (SPEC.md CAP-6).
- `canhBaoNganSach` rides inline in `themGiaoDich`/`suaGiaoDich`'s response (`data.canhBaoNganSach`, `null` if none) — never a separate channel (AD-3); carries only the triggering Danh mục's `hanMuc`/`daChi`/`phanTramConLai`.
- Writes go through `datHanMucNganSach` in `app/chi-tieu/actions.ts` via `boiCanhGhi()`, same response shape as existing actions.
- Reuse `layMocDauThangVN()`/`layMocDauThangKeTiepVN()` (`lib/ngayVn.ts`) for all month math.
- No `NganSach` row for the current month = no budget/alert; no default or inherited hạn mức.

**Ask First:** none — continuation of Story 3's `chi-tieu` patterns.

**Never:** multi-category Ngân sách overview (deferred, see `deferred-work.md` — overlaps Story 5/CAP-7); Danh mục rename/delete (still deferred); editing a future/past month's hạn mức; `canhBaoNganSach` on `xoaGiaoDich`; dashboard/hub (Story 11) — render inline on `/chi-tieu`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Set/re-set hạn mức | danhMucChiTieuId, hanMuc>0, current month | Upsert creates or updates only the current-month row | hanMuc<=0 or non-integer blocked, field error |
| Add Chi crossing 30% remaining | resulting daChi/hanMuc >= 70% | `canhBaoNganSach` = "Dưới ngưỡng cảnh báo 30%" | N/A |
| Add Chi exceeding hạn mức | resulting daChi > hanMuc | `canhBaoNganSach` = "Đã vượt ngân sách" + số tiền vượt | N/A |
| Add Chi/Thu with no alert case | no `NganSach` row this month, or loai=Thu | `canhBaoNganSach` = null | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- add `NganSach` (`id`, `danhMucChiTieuId`, `thang DateTime`, `hanMuc Int`, `@@unique([danhMucChiTieuId, thang])`, `onDelete: Restrict` like `GiaoDich`, schema.prisma:120-121) after `GiaoDich` (line 133); back-relation on `DanhMucChiTieu` (schema.prisma:97-102)
- `app/chi-tieu/model.ts` -- add `NganSach` type alongside `DanhMuc`/`GiaoDich`
- `app/chi-tieu/actions.ts` -- `kiemTraHanMuc()` validator (mirrors `actions.ts:100`); `datHanMucNganSach(danhMucChiTieuId, hanMuc)` -- `prisma.nganSach.upsert()` on the compound key, `boiCanhGhi()`-wrapped like `themGiaoDich` (`actions.ts:201-221`); `tinhCanhBaoNganSach(danhMucChiTieuId, thoiDiem)` helper, called from `themGiaoDich`/`suaGiaoDich` (`actions.ts:250-291`) only when `loai === "Chi"`
- `app/chi-tieu/queries.ts` -- `layDanhMucVoiHanMucThangHienTai()`: `{danhMucChiTieuId, ten, hanMuc | null}` for the current month, to prefill inputs
- `app/chi-tieu/ChiTieuView.tsx` -- "Hạn mức tháng này" row per Danh mục (input + save -> `datHanMucNganSach`); render `canhBaoNganSach` as `.alert-box`+`.budget-card`+`.threshold-tag` per `mockups/quick-transaction.html:277-297`
- `app/globals.css` -- port `.budget-card`, `.threshold-tag`, `.alert-box`, `.bar`, `.pct-big` from `mockups/quick-transaction.html:161-183` (accent-only, no red/orange — DESIGN.md:182,254)
- `app/chi-tieu/actions.test.ts`, `queries.test.ts` -- extend with the I/O matrix cases

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` + migration -- add `NganSach`
- [x] `app/chi-tieu/model.ts` -- `NganSach` type
- [x] `app/chi-tieu/actions.ts` -- `datHanMucNganSach` + `tinhCanhBaoNganSach` in `themGiaoDich`/`suaGiaoDich`
- [x] `app/chi-tieu/queries.ts` -- `layDanhMucVoiHanMucThangHienTai()`
- [x] `app/chi-tieu/ChiTieuView.tsx` -- hạn mức input row + alert rendering
- [x] `app/globals.css` -- port budget/alert classes
- [x] unit tests -- cover I/O matrix rows

**Acceptance Criteria:**
- Given hạn mức 3.000.000đ and 0 đã chi, when a Chi of 2.200.000đ is added (26% còn lại), then the save response carries `canhBaoNganSach` with "Dưới ngưỡng cảnh báo 30%" and `/chi-tieu` shows it immediately.
- Given a `NganSach` row exists for a past month, when the current month's hạn mức is edited, then the past row is unchanged.

## Design Notes

No dashboard exists yet (Story 11) — hạn mức inputs and the alert render inline on `/chi-tieu` as `.card` blocks, same precedent as Story 3's quick-add.

## Verification

**Commands:**
- `npx prisma migrate dev` -- creates `NganSach`, no errors
- `npm test` -- all pass
- `npm run build` -- succeeds, no type errors

**Manual checks:**
- On `/chi-tieu`: set a hạn mức, add Chi past 30% then past 100%, confirm the alert appears each time with the right label; edit the current month's hạn mức and confirm a past month's row is untouched (DB inspection).

## Suggested Review Order

**Threshold computation — the core CAP-6 logic**

- `tinhCanhBaoNganSach()` — the single funnel that decides whether a Chi save produces an alert; start here to see the whole rule in one place.
  [`actions.ts:226`](../../../../app/chi-tieu/actions.ts#L226)

- Integer-only threshold comparison (`daChi * 10 < hanMuc * 7`) — avoids float error from `daChi / hanMuc >= 0.7`.
  [`actions.ts:249`](../../../../app/chi-tieu/actions.ts#L249)

- Wired into both write paths — `themGiaoDich`/`suaGiaoDich` compute it only for `loai === "Chi"`, never for Thu or delete.
  [`actions.ts:289`](../../../../app/chi-tieu/actions.ts#L289)

**Ngân sách write path — AD-2's forward-only edit**

- `datHanMucNganSach()` — always `upsert`s the current VN month's key, never accepts a month from the client.
  [`actions.ts:469`](../../../../app/chi-tieu/actions.ts#L469)

- `NganSach` model — unique on `(danhMucChiTieuId, thang)`, the row-per-month shape that makes past-month overwrite structurally impossible.
  [`schema.prisma:141`](../../../../prisma/schema.prisma#L141)

**Review-caught fix — stale alert on delete**

- `xoa()` now clears `canhBao` on a successful delete, since `xoaGiaoDich` never recomputes it (Never boundary) and a stale banner would otherwise linger.
  [`ChiTieuView.tsx:115`](../../../../app/chi-tieu/ChiTieuView.tsx#L115)

**Review-caught fix — boundary and scoping test gaps**

- Exact-70%-spent boundary — confirms the alert still fires exactly at the threshold, not just past it.
  [`actions.test.ts:616`](../../../../app/chi-tieu/actions.test.ts#L616)

- Exact-100%-spent boundary — confirms `daVuot = daChi > hanMuc` reports `false` at the limit, matching "vượt" meaning strictly over.
  [`actions.test.ts:648`](../../../../app/chi-tieu/actions.test.ts#L648)

- `where`-clause assertions on `nganSach.findUnique`/`giaoDich.aggregate` — closes the gap where canned mocks could mask a wrong-month or wrong-category regression.
  [`actions.test.ts:564`](../../../../app/chi-tieu/actions.test.ts#L564)

**UI — alert rendering and hạn mức input**

- `KhoiCanhBaoNganSach` — derives "dưới ngưỡng" vs "đã vượt" from `daChi`/`hanMuc` rather than a separate field, per Boundaries.
  [`ChiTieuView.tsx:585`](../../../../app/chi-tieu/ChiTieuView.tsx#L585)

- `HangHanMuc` — inline hạn mức input + save, one row per Danh mục.
  [`ChiTieuView.tsx:642`](../../../../app/chi-tieu/ChiTieuView.tsx#L642)

**Read path (AD-1) — prefill query**

- `layDanhMucVoiHanMucThangHienTai()` — current-month hạn mức per Danh mục, `null` when unset, reusing the module's month-boundary convention.
  [`queries.ts:97`](../../../../app/chi-tieu/queries.ts#L97)

**Peripherals**

- `NganSach`/`CanhBaoNganSach`/`GiaoDichDaGhi` types — `CanhBaoNganSach` carries only the triggering Danh mục's own numbers, no separate "alert kind" field.
  [`model.ts:51`](../../../../app/chi-tieu/model.ts#L51)

