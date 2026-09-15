---
title: 'Story 11: Dashboard Hôm nay (Today Hub)'
type: 'feature'
created: '2026-09-16'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'aef573bbd2b7ab5b0a8966a919d4041135b0c45f'
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-personal_phuongna-2026-08-20/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/EXPERIENCE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/mockups/dashboard.html'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/glossary.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/stories.yaml'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** All 4 modules exist but each only lives on its own page — there is no single entry point giving a one-glance view across Lịch trình/Chi tiêu/Thực đơn/Học tập (UJ-1's core premise).

**Approach:** Add `app/page.tsx` — a fully read-only summary hub at `/`, four cards (Lịch trình, Chi tiêu, Thực đơn, Học tập), each linking to its own module page for any editing, including checking off a Task. Everything the mock shows as inline-editable (quick-add Giao dịch sheet, inline Thực đơn assignment, inline Ghi buổi học, inline Task check-off) is narrowed out — see `deferred-work.md`. The aggregation layer only calls each module's own exported `queries.ts` functions, never another module's Prisma models (AD-1).

## Boundaries & Constraints

**Always:**
- `app/page.tsx` only imports from each module's `queries.ts` — never a Prisma model directly, never another module's `actions.ts`/`model.ts` internals. No Server Action is called from this page at all.
- Lịch trình's card reuses `layLichTrinhNgay()` (today) as-is; Thực đơn's card reuses `layThucDonNgay()` (tomorrow) as-is; Học tập's card reuses `tinhStreak()` and `layLoTrinh()` (both Kỹ năng) as-is — no changes to any of these three modules.
- Chi tiêu is the one module needing new read logic: `layCanhBaoNganSachHienTai()` (current-month, all categories with a set hạn mức, same 30%-remaining/over-100% thresholds as `tinhCanhBaoNganSach()` in `actions.ts`) — a pure read, never called from a write path.
- Each card links to its module's existing page for any editing or creating.
- Empty-state text follows EXPERIENCE.md verbatim convention: one short hint line + a primary link (e.g. Học tập card with zero Buổi học ever: "Chưa có buổi học nào — Ghi buổi học đầu tiên →" linking to `/hoc-tap`).
- Keyboard Tab order matches EXPERIENCE.md's Accessibility Floor exactly: brand → greeting → avatar → the 4 cards in Lịch trình → Chi tiêu → Thực đơn → Học tập order.
- `taoLichTrinhNgayTuMau()` (existing lazy day-init) is called before reading today's Lịch trình, mirroring `/lich-trinh`'s own page.

**Ask First:** none — the exact card visual density (how many Task/Mốc rows to show before truncating) is ordinary UI implementation.

**Never:** no Server Action call of any kind from this page — no Task check-off, no quick-add Giao dịch sheet, no inline Thực đơn assignment, no inline Ghi buổi học form (all deferred, see `deferred-work.md`); no new Prisma models; no user/profile data behind the decorative avatar (AD-5 — no User model, the avatar is a static placeholder, never wired to anything).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First-ever visit, all 4 modules empty | no data anywhere | All 4 cards show their empty-state hint + primary link, no crashes | N/A |
| Chi tiêu: no Ngân sách set this month at all | zero `NganSach` rows for the current month | Card shows a distinct "chưa đặt Ngân sách" hint, not a false "no warnings" positive state | N/A |
| Chi tiêu: Ngân sách set, all categories healthy | `NganSach` rows exist, none below 30% remaining | Card shows a positive "trong hạn mức" state, not empty | N/A |
| Chi tiêu: one or more categories in warning/over | at least one category ≤30% remaining or >100% | Card lists each one with its % state | N/A |
| Thực đơn: tomorrow partially assigned | e.g. only Sáng filled for one Nhóm khẩu phần | Card shows exactly what's assigned, empty slots read as unassigned — no crash on partial data | N/A |
| Học tập: one Kỹ năng has sessions, the other doesn't | e.g. Tiếng Anh has a streak, Automation Test has none | Each Kỹ năng's summary reflects only its own data — mirrors every prior story's independence rule | N/A |
| Học tập: a Kỹ năng's Lộ trình fully completed | `layMocHienTai()` returns `null` for that Kỹ năng | Card shows the terminal "Đã hoàn thành Lộ trình" state, not a crash on a missing current Mốc | N/A |

</frozen-after-approval>

## Code Map

- `app/lich-trinh/queries.ts` (`layLichTrinhNgay()`, existing) -- reuse as-is, called with no argument (defaults to today)
- `app/thuc-don/queries.ts` (`layThucDonNgay()`, existing) -- reuse as-is, called with tomorrow's date (`themNgay(layMocNgayVN(), 1)`)
- `app/hoc-tap/queries.ts` (`tinhStreak()`, `layLoTrinh()`, existing) -- reuse as-is, called for both `"TiengAnh"`/`"AutomationTest"`
- `app/chi-tieu/queries.ts` (`layDanhMucVoiHanMucThangHienTai()` `:121`, `layBaoCaoThang()` `:163` for the per-category `daChi` aggregation pattern to reuse) -- add `layCanhBaoNganSachHienTai(): Promise<CanhBaoNganSachDanhMuc[]>` joining current-month `hanMuc` per category with summed `daChi`, filtering to categories at/below the same 30%-remaining threshold `tinhCanhBaoNganSach()` uses in `actions.ts:212-213,249` (mirror the ratio, this function never calls that one — it's a fresh read, not tied to a write)
- `lib/ngayVn.ts` -- reuse `layMocNgayVN()`, `themNgay()`, `formatNgayVN()` as-is
- `app/lich-trinh/actions.ts` (`taoLichTrinhNgayTuMau()`, existing) -- reuse as-is, called before the Lịch trình read (no other changes to this file)
- `app/chi-tieu/page.tsx`, `app/lich-trinh/page.tsx`, `app/thuc-don/chon-mon/page.tsx`, `app/hoc-tap/page.tsx` -- reuse pattern (not code) for the Server-Component-reads/Client-Component-renders split, `force-dynamic`
- `app/page.tsx` (NEW) -- Server Component, `force-dynamic`, calls `taoLichTrinhNgayTuMau()` then the above reads in one `Promise.all`, renders `DashboardView`
- `app/DashboardView.tsx` (NEW) -- Client Component (or a plain Server Component, since nothing here is interactive — implementer's call): greeting (time-of-day text), decorative avatar, 4 read-only cards in the fixed Tab-order sequence, each ending in a link to its module page
- `app/globals.css` -- new `.greeting`/`.avatar`/`.grid` (4-card layout) classes per the mock; reuse existing `.chk`/`.bar`/`.card`/`.info-box` tokens where they already fit (e.g. `.info-box` for the "healthy" state), a new class only for the warning list if nothing existing matches
- `app/chi-tieu/queries.test.ts` (existing file, extend) -- cover every I/O matrix row for `layCanhBaoNganSachHienTai()`

## Tasks & Acceptance

**Execution:**
- [x] `app/chi-tieu/queries.ts` -- `layCanhBaoNganSachHienTai()`
- [x] `app/page.tsx` -- root dashboard page
- [x] `app/DashboardView.tsx` -- 4-card read-only UI
- [x] `app/globals.css` -- dashboard-specific styles
- [x] unit tests -- cover `layCanhBaoNganSachHienTai()`'s I/O matrix rows

**Acceptance Criteria:**
- Given `app/page.tsx`, when grepped for `prisma` or any `actions.ts` import, then there are zero matches — every read goes through an imported `queries.ts` function and nothing writes (AD-1 compliance, fully read-only).
- Given all 4 modules empty, when `/` is visited fresh, then no card throws or renders `undefined`/`NaN` — each shows its documented empty state.
- Given data exists in all 4 modules, when `/` is visited, then each card's numbers match what that module's own page shows for the same day/month.

## Design Notes

No page-level or component-level test infra exists anywhere in this project (confirmed across every prior story's review) — `layCanhBaoNganSachHienTai()` gets a real `queries.test.ts` entry (pure function, same convention as every other query), but `app/page.tsx`/`DashboardView.tsx` themselves are manual-check-only, consistent with every other module's page.

Three of four modules need zero new code because their existing `queries.ts` functions already return exactly what the dashboard needs — adding thin `layTomTatHomNay()` wrappers around them would be indirection with no behavioral difference, so this spec intentionally skips that for Lịch trình/Thực đơn/Học tập and reuses the functions directly. Chi tiêu is the exception because no existing function computes "which categories are currently in warning" as a plain read.

## Verification

**Commands:**
- `npm test` -- all pass, including new `layCanhBaoNganSachHienTai()` cases
- `npm run build` -- succeeds, no type errors

**Manual checks:**
- Visit `/` fresh (before adding any data): confirm all 4 cards show their empty states with working links to each module page. Add a Task, a Giao dịch near a Ngân sách limit, a Thực đơn assignment for tomorrow, and a Buổi học — revisit `/` and confirm each card reflects the new data and its link lands on the right module page.

## Suggested Review Order

**The entry point — AD-1 boundary**

- `TrangHomNay()` — reads only via each module's `queries.ts`, plus the one sanctioned `taoLichTrinhNgayTuMau()` lazy-init; zero Prisma imports.
  [`page.tsx:44`](../../../../app/page.tsx#L44)

- `layCanhBaoNganSachHienTai()` — new Chi tiêu read, current-month per-category warning state, never called from a write path.
  [`queries.ts:255`](../../../../app/chi-tieu/queries.ts#L255)

- Review-caught fix: the 30%-threshold constants now live once in `model.ts`, imported by both `actions.ts` and `queries.ts` — no more silent-drift risk between the write-time alert and this read.
  [`model.ts:98`](../../../../app/chi-tieu/model.ts#L98)

**Review-caught fixes — the two most load-bearing branches, now pure and tested**

- `xacDinhTrangThaiNganSach()` — the Chi tiêu card's 3-way state (chưa đặt / lành mạnh / cảnh báo), extracted out of JSX into a tested pure function.
  [`model.ts:114`](../../../../app/chi-tieu/model.ts#L114)

- `laChuaCoHoatDongHocTap()` — the Học tập card's "no activity yet" heuristic, same treatment, mirrors Story 10's `biChanHoanThanhBoiGateDiem()` precedent.
  [`model.ts:181`](../../../../app/hoc-tap/model.ts#L181)

**UI — the hub itself**

- `DashboardView` — 4 read-only cards in the required Tab order, calling the two extracted functions above rather than inlining their logic.
  [`DashboardView.tsx:129`](../../../../app/DashboardView.tsx#L129)

**Peripherals**

- Full I/O matrix coverage plus the new aggregation/rounding/dead-code cleanup tests.
  [`queries.test.ts`](../../../../app/chi-tieu/queries.test.ts)

