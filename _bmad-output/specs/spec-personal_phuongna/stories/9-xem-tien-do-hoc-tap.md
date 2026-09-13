---
title: 'Story 9: Xem tiến độ học tập (Study Progress View)'
type: 'feature'
created: '2026-09-14'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'aa786d4f80b4bcd9ac9c5761d97ce2553d7892fc'
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-personal_phuongna-2026-08-20/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/EXPERIENCE.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/glossary.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/stories.yaml'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Buổi học rows accumulate (Story 8) but nothing lets them be reviewed — no history, no running streak, no monthly total per Kỹ năng.

**Approach:** Extend the existing `/hoc-tap` screen: below each Kỹ năng's log form, add that Kỹ năng's streak (consecutive days with a session, satisfies CAP-12's "streak or chart" bar — chart is not built, streak alone is sufficient per spec), a month-scoped tổng thời lượng, and the list of that month's sessions — one shared `?thang=yyyy-mm` month-nav for both columns, mirroring `app/chi-tieu/page.tsx`'s exact pattern. This story covers the Buổi học half of CAP-12 only — "lịch sử Điểm số Bài test đánh giá cho Tiếng Anh" is narrowed out (see `deferred-work.md`): `BaiTestDanhGia` always attaches to a `Moc`, and `Moc`/`LoTrinh` don't exist until Story 10, so there is no data for this story to show yet.

## Boundaries & Constraints

**Always:**
- Streak is a running, all-time count independent of whichever month `?thang=` is currently viewing — never scoped to the displayed month.
- Streak counts consecutive calendar days (Asia/Ho_Chi_Minh, via `layMocNgayVN()`/`themNgay()`) with at least one `BuoiHoc` row for that Kỹ năng; multiple sessions on the same day count once. If today has no session yet, counting starts from yesterday instead of resetting to 0 (a day not yet over doesn't break the streak).
- The two Kỹ năng are fully independent — Tiếng Anh's streak/tổng/lịch sử never reads or is affected by Automation Test's rows, and vice versa (mirror every prior story's independence rule).
- Month-nav mirrors `app/chi-tieu/page.tsx`'s exact pattern: `?thang=yyyy-mm`, clamped between the earliest month with any `BuoiHoc` row (across both Kỹ năng) and the current month — never past, never future.
- All reads go through this module's own `queries.ts` (AD-1) — no other module's Prisma models are touched.

**Ask First:** none — exact list-item layout (e.g. one line per session vs. a card) is ordinary UI implementation.

**Never:** no lịch sử Điểm số Bài test đánh giá / `BaiTestDanhGia`/`Moc`/`LoTrinh` (Story 10's scope, see `deferred-work.md`); no charting library or new visual-chart component (streak alone satisfies CAP-12's "at least one of streak or chart" bar); no dashboard integration (Story 11 doesn't exist yet); no changes to `ghiBuoiHoc()`'s write path or validation (Story 8, already done).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| No Buổi học ever for a Kỹ năng | empty `BuoiHoc` for that `kyNang` | Streak = 0, month total = 0, empty-state hint in the list | N/A |
| Session logged today only | one row, `ngay` = today | Streak = 1 | N/A |
| Sessions logged today and yesterday | two rows, consecutive days | Streak = 2 | N/A |
| Sessions yesterday and the day before, none today | two rows, no row for today | Streak = 2 (today not yet "missed") | N/A |
| Gap in history | a row 3 days ago only, none yesterday/today | Streak = 0 | N/A |
| Two sessions same day | two rows with the same `ngay` | Counted once toward streak; month total sums both; both appear in the list | N/A |
| View a past month via `?thang=` | navigate ◀ to a month with sessions | That month's list/total shown; streak is unchanged (still the current running streak, not that month's) | N/A |
| `?thang=` before the earliest month with any session | malformed/out-of-range input | Clamped to the earliest month with data (mirror `app/chi-tieu/page.tsx`'s clamp) | N/A |

</frozen-after-approval>

## Code Map

- `app/chi-tieu/page.tsx` (`:39-95`) -- reuse pattern (not code) for `?thang=` parsing, clamping between earliest-month-with-data and current month, and ◀/▶ href construction
- `lib/ngayVn.ts` -- reuse `layMocDauThangVN()`, `layMocDauThangKeTiepVN()`, `thamSoThangVN()`, `tuThamSoThang()`, `formatThangVN()`, `layMocNgayVN()`, `themNgay()` as-is (no changes)
- `app/hoc-tap/model.ts` (`:13` `KY_NANG`, `:24` `NHAN_KY_NANG`, `:30` `BuoiHocDaGhi`) -- reuse as-is; no new types needed beyond a small streak/report shape
- `app/hoc-tap/actions.ts` (`:151` `ghiBuoiHoc`) -- untouched, read-only story
- `app/hoc-tap/queries.ts` (NEW) -- `layThangSomNhatHocTap()` (earliest month across both Kỹ năng, mirror `app/chi-tieu/queries.ts`'s `layThangSomNhat()`), `layLichSuThang(kyNang, thang)` (that month's `BuoiHoc` rows + summed `thoiLuongPhut`), `tinhStreak(kyNang)` (fetch all `ngay` values for that `kyNang`, dedupe to a day-`Set`, walk backward from today per the Boundaries algorithm)
- `app/hoc-tap/page.tsx` (existing, extend) -- add `searchParams: Promise<{ thang?: string }>`, call the three new queries for both fixed Kỹ năng, pass results to `HocTapView`
- `app/hoc-tap/HocTapView.tsx` (existing, extend) -- each `KyNangForm`'s column gets a new sibling section below the form: streak line, month-nav (shared, rendered once), month total, session list
- `app/globals.css` -- reuse `.task-row`/`.empty-row`/`.day-nav`/`.info-box` tokens already established; no new component classes expected
- `app/hoc-tap/queries.test.ts` (NEW) -- cover every I/O matrix row above, following `app/chi-tieu/queries.test.ts`'s mocking convention

## Tasks & Acceptance

**Execution:**
- [x] `app/hoc-tap/queries.ts` -- `layThangSomNhatHocTap()`, `layLichSuThang()`, `tinhStreak()`
- [x] `app/hoc-tap/page.tsx` -- `?thang=` handling + clamp + wire the three queries for both Kỹ năng
- [x] `app/hoc-tap/HocTapView.tsx` -- streak line, shared month-nav, month total, session list per column
- [x] unit tests -- cover every I/O matrix row above

**Acceptance Criteria:**
- Given a session logged for Tiếng Anh only, when the page renders, then Automation Test's streak/total/list are exactly as they were before (byte-for-byte unaffected).
- Given `?thang=` pointing at a month before any `BuoiHoc` row exists, when the page renders, then it's clamped to the earliest month with data, never an empty out-of-range month.
- Given no other module's code, when grepped for `tinhStreak`/`layLichSuThang`, then only `app/hoc-tap/**` references them (AD-1 compliance).

## Verification

**Commands:**
- `npm test` -- all pass, including new `app/hoc-tap/queries.test.ts`
- `npm run build` -- succeeds, no type errors

**Manual checks:**
- On `/hoc-tap`: log a Tiếng Anh session today, confirm its streak shows 1 and today's session appears in the list with the correct tổng. Navigate ◀ to a month before any data exists; confirm it clamps to the earliest real month instead of showing a blank unreachable one. Confirm Automation Test's column is untouched by any of the above.

## Suggested Review Order

**Streak — the new computed metric**

- `tinhStreak()` — walks backward day-by-day from today (VN), falling back to yesterday if today has no session yet; dedupes same-day sessions.
  [`queries.ts:88`](../../../../app/hoc-tap/queries.ts#L88)

- `TienDoCot` — zero-streak renders a distinct nudge message instead of "🔥 0 ngày liên tiếp".
  [`HocTapView.tsx:152`](../../../../app/hoc-tap/HocTapView.tsx#L152)

**Queries — month scoping and the shared clamp floor**

- `layThangSomNhatHocTap()` — earliest month across both Kỹ năng, mirrors `app/chi-tieu/queries.ts`'s `layThangSomNhat()`.
  [`queries.ts:30`](../../../../app/hoc-tap/queries.ts#L30)

- `layLichSuThang()` — month-range filtered `BuoiHoc` rows + summed `thoiLuongPhut` for one Kỹ năng.
  [`queries.ts:57`](../../../../app/hoc-tap/queries.ts#L57)

- `BuoiHoc`'s new `@@index([ngay])` — backs both queries' `ngay`-scoped access, mirrors `GiaoDich`'s identical index.
  [`schema.prisma:294`](../../../../prisma/schema.prisma#L294)

**Page — shared month-nav for both independent columns**

- `TrangHocTap()` — `?thang=` parse/clamp is a byte-for-byte mirror of `app/chi-tieu/page.tsx`; streak computed outside the clamp (never month-scoped).
  [`page.tsx:40`](../../../../app/hoc-tap/page.tsx#L40)

**Review-caught fixes — dedupe and formatting**

- `dinhDangBuoiHoc()` — moved out of `actions.ts` into `model.ts` so `queries.ts` no longer carries a duplicate copy.
  [`model.ts:55`](../../../../app/hoc-tap/model.ts#L55)

- `formatPhut()` — durations now go through `toLocaleString("vi-VN")`, matching `formatTien()`'s precedent in Chi tiêu.
  [`HocTapView.tsx:35`](../../../../app/hoc-tap/HocTapView.tsx#L35)

**Peripherals**

- Full I/O matrix coverage, including the strengthened Kỹ-năng-independence test for `tinhStreak()`.
  [`queries.test.ts`](../../../../app/hoc-tap/queries.test.ts)

