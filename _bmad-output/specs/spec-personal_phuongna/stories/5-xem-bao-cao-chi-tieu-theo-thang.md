---
title: 'Story 5: Monthly Expense Report (Xem báo cáo chi tiêu theo tháng)'
type: 'feature'
created: '2026-09-10'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'd44843bd18acf503a8f3b2dde982bc2ca6be37e6'
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-personal_phuongna-2026-08-20/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/EXPERIENCE.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/glossary.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/stories.yaml'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/chi-tieu` only ever shows the current month (CAP-4's scope) — CAP-7 requires viewing totals and per-Danh-mục detail for any past month too, and Story 4 deferred its "overview" work here specifically because this is the same surface.

**Approach:** Add a read-only "Báo cáo tháng" section on `/chi-tieu` with month navigation via `?thang=yyyy-mm` (mirroring Story 2's `?ngay=yyyy-mm-dd` day-nav pattern), showing Chi/Thu totals plus a per-Danh-mục breakdown (đã chi, and hạn mức/% còn lại when a `NganSach` row exists for that month).

## Boundaries & Constraints

**Always:**
- Month navigation is a URL search param (`?thang=yyyy-mm`) read by the Server Component and rendered as plain `<Link>`s — no client-side date state, mirroring `app/lich-trinh/page.tsx:36-73`.
- Ceiling = current VN month (no future); floor = earliest month containing any `GiaoDich` (mirror `layNgaySomNhat()`, `app/lich-trinh/queries.ts:109-114`). Both bounds are enforced server-side regardless of which nav links the UI renders.
- New month string helpers (`thamSoThangVN`/`tuThamSoThang`/`formatThangVN`) go in `lib/ngayVn.ts`; every month format/parse in this story uses them, no ad hoc string slicing.
- Chi/Thu totals summed strictly by `loai`, same convention as `layGiaoDichThangHienTai()`.
- This report is read-only: it never writes `GiaoDich` or `NganSach`, and navigating months never changes what the existing quick-add form or "Hạn mức tháng này" section operate on (both stay pinned to the real current month).

**Ask First:** none — continuation of Story 2's day-nav and Story 4's per-category budget-card patterns.

**Never:** no editing hạn mức or logging Giao dịch for a past month (AD-2, still current-month-only); no Danh mục rename/delete; no dashboard/hub (Story 11) — renders as a new card on `/chi-tieu`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| No `?thang` given | default load | Report shows the current month's totals + breakdown | N/A |
| Valid past month | `?thang=2026-07` | Report shows July 2026's totals + per-Danh-mục `daChi` | N/A |
| Navigate before earliest month with data | at floor month | "◀" link absent/disabled, same as day-nav's `hrefTruoc: null` | N/A |
| Navigate past current month | at ceiling month | "▶" link absent/disabled | N/A |
| Malformed `?thang` value | e.g. `?thang=abc` | Falls back to current month, same as `tuThamSoNgay`'s null-on-invalid pattern | N/A |
| Danh mục with Chi but no `NganSach` row that month | — | Breakdown row shows `daChi`, `hanMuc: null`, no % | N/A |

</frozen-after-approval>

## Code Map

- `lib/ngayVn.ts` -- add `thamSoThangVN(moc: Date): string` (format as `yyyy-mm`), `tuThamSoThang(gia: string): Date | null` (parse + validate, return `layMocDauThangVN()` of it), `formatThangVN(moc: Date): string` (human label "Tháng M/yyyy") — mirror `thamSoNgayVN()`/`tuThamSoNgay()` (`ngayVn.ts:55-58,85-99`)
- `app/chi-tieu/queries.ts` -- add `layThangSomNhat(): Promise<Date | null>` (earliest month with any `GiaoDich`, mirror `layNgaySomNhat()` `app/lich-trinh/queries.ts:109-114`); add `layBaoCaoThang(thoiDiem: Date): Promise<BaoCaoThang>` -- `{thang, tongChi, tongThu, chiTietDanhMuc: {danhMucChiTieuId, ten, daChi, hanMuc}[]}`, group Chi by `danhMucChiTieuId` within `[layMocDauThangVN, layMocDauThangKeTiepVN)`, left-join `NganSach` for that month
- `app/chi-tieu/page.tsx` -- add `searchParams: Promise<{thang?: string}>` param; parse via `tuThamSoThang`, clamp into `[thangSomNhat, thangHienTai]` server-side (mirror `app/lich-trinh/page.tsx:43-56,63-73`); compute `hrefTruoc`/`hrefSau`; call `layBaoCaoThang()`, pass report + nav props to `ChiTieuView`
- `app/chi-tieu/ChiTieuView.tsx` -- new "Báo cáo tháng" `<section className="card">` below the existing sections; month-nav `<nav>` + `<Link>` ◀/▶ + label, mirroring `LichTrinhNgayView.tsx:128-172`; per-Danh-mục rows (đã chi, and hạn mức/% khi có, reusing `.budget-card`-style display from Story 4)
- `lib/ngayVn.test.ts`, `app/chi-tieu/queries.test.ts` -- extend with the new helpers/queries, hand-computed month boundaries + year-rollover case, per existing convention (`queries.test.ts:47-55`)

## Tasks & Acceptance

**Execution:**
- [x] `lib/ngayVn.ts` -- `thamSoThangVN`/`tuThamSoThang`/`formatThangVN`
- [x] `app/chi-tieu/queries.ts` -- `layThangSomNhat()` + `layBaoCaoThang()`
- [x] `app/chi-tieu/page.tsx` -- `searchParams.thang` parsing, clamping, nav hrefs
- [x] `app/chi-tieu/ChiTieuView.tsx` -- "Báo cáo tháng" section + month-nav
- [x] unit tests -- cover every I/O matrix row above

**Acceptance Criteria:**
- Given Giao dịch exist in July and August 2026, when `/chi-tieu?thang=2026-07` loads, then the report shows July's totals and per-Danh-mục `daChi`, not August's.
- Given the earliest Giao dịch is in July 2026, when viewing July's report, then the "◀" nav link is absent.
- Given a Danh mục has a `NganSach` row for July 2026, when viewing July's report, then that row's breakdown shows `hanMuc` and `% còn lại`; a Danh mục without one shows `hanMuc: null`.

## Verification

**Commands:**
- `npm test` -- all pass
- `npm run build` -- succeeds, no type errors

**Manual checks:**
- On `/chi-tieu`, use the new month-nav to step back to a month with data, confirm totals/breakdown match; step back until "◀" disappears at the earliest month with data; confirm the quick-add form and "Hạn mức tháng này" section are unaffected by which month the report is showing.

## Suggested Review Order

**Month navigation — the new URL-driven pattern**

- `TrangChiTieu()` — reads `?thang=`, clamps into `[thangSomNhat, thangHienTai]` server-side regardless of which nav links render, mirroring `app/lich-trinh/page.tsx`'s day-nav clamp.
  [`page.tsx:43`](../../../../app/chi-tieu/page.tsx#L43)

- `tuThamSoThang()` — parses `yyyy-mm`, round-trip-validated so an out-of-range month (e.g. "2026-13") can't silently roll into the wrong year.
  [`ngayVn.ts:114`](../../../../lib/ngayVn.ts#L114)

**Report query — the core CAP-7 read**

- `layBaoCaoThang()` — totals by `loai`, per-Danh-mục grouping, left-joined `NganSach` for the viewed month only.
  [`queries.ts:163`](../../../../app/chi-tieu/queries.ts#L163)

- Explicit sort by tên — needed since the underlying `giaoDich.findMany` has no `orderBy`; a dedicated test now forces non-alphabetical input to prove it.
  [`queries.ts:220`](../../../../app/chi-tieu/queries.ts#L220)
  [`queries.test.ts:453`](../../../../app/chi-tieu/queries.test.ts#L453)

- `layThangSomNhat()` — floors the earliest Giao dịch to its month start, the floor bound for "◀".
  [`queries.ts:146`](../../../../app/chi-tieu/queries.ts#L146)

**Review-caught fix — rounding consistency with CAP-6**

- `HangBaoCaoDanhMuc`'s `phanTramConLai` now uses `Math.floor`, matching `tinhCanhBaoNganSach()`'s convention so the same category/month never shows two different percentages across the report and the alert.
  [`ChiTieuView.tsx:809`](../../../../app/chi-tieu/ChiTieuView.tsx#L809)

**Review-caught fix — nav placement and label wording**

- Month-nav moved inside the "Báo cáo tháng" section, directly under its heading, so it reads as controlling the report rather than the transaction log above it.
  [`ChiTieuView.tsx:262`](../../../../app/chi-tieu/ChiTieuView.tsx#L262)

**UI — report rendering**

- `HangBaoCaoDanhMuc` — read-only row, reuses Story 4's `.budget-card`/`.pct-big`/`.bar` when a hạn mức exists, a plain `.task-row` otherwise.
  [`ChiTieuView.tsx:792`](../../../../app/chi-tieu/ChiTieuView.tsx#L792)

**Peripherals**

- `thamSoThangVN`/`formatThangVN` — the `yyyy-mm` query-string form and the "Tháng M/yyyy" display form, both funneling through `lib/ngayVn.ts` per the module's own convention.
  [`ngayVn.ts:103`](../../../../lib/ngayVn.ts#L103)

