---
title: 'Story 10: Lộ trình & Mốc (Roadmap & Milestones)'
type: 'feature'
created: '2026-09-15'
status: 'done'
review_loop_iteration: 0
baseline_commit: '9f1e0ecd8aa7dd19174e7040650cce82efff12d7'
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-personal_phuongna-2026-08-20/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/EXPERIENCE.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/glossary.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/stories.yaml'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Neither Kỹ năng has a Lộ trình yet — there's no way to see current position, mark a Mốc Hoàn thành, or (for Tiếng Anh) record the Bài test đánh giá that gates completion.

**Approach:** Extend `/hoc-tap`: below each Kỹ năng's existing progress section, add a Lộ trình section showing completed Mốc (viewable), the current Mốc (a card with a "Hoàn thành Mốc" button — for Tiếng Anh, disabled until a Điểm số is entered inline in that same card, no separate modal), and remaining Mốc (dimmed, not yet reachable). Automation Test has 7 fixed Mốc, Tiếng Anh has 3 (A1, A2, B1) — titles/order are fixed app-layer constants, never user-edited. Exactly one shared Server Action `hoanThanhMoc(mocId)` handles both Kỹ năng, gating internally on `Moc.kyNang` rather than splitting into two actions or only hiding the UI button. A dedicated Điểm số **history** view (all attempts across time, the other half of CAP-12 deferred from Story 9) is narrowed further out of this story — see `deferred-work.md`; this story only needs to know whether *a* score exists for the current Mốc, to drive the gate.

## Boundaries & Constraints

**Always:**
- `LoTrinh` is not its own Prisma model — it's an implicit 1-per-Kỹ-năng concept; `Moc` carries `kyNang` directly (mirrors the ERD's conceptual-node-vs-physical-table split already established for `NhomKhauPhan`/`ThucDonNgay` in Story 7 — see Design Notes).
- Mốc titles and order (`thuTu`) are fixed app-layer constants (mirror `KY_NANG`/`BUOI`'s `as const` pattern) — the DB never stores milestone text, only which `(kyNang, thuTu)` slot exists and its completion state.
- All 10 fixed `Moc` rows (3 Tiếng Anh + 7 Automation Test) are lazy-seeded via one idempotent function, called before every read of this module's roadmap data — mirror `app/lich-trinh/actions.ts`'s `taoLichTrinhNgayTuMau()` "AD-3 ngoại lệ 2" lazy-init convention. Upsert on `@@unique([kyNang, thuTu])`, never duplicate rows.
- "Vị trí hiện tại" is never a stored pointer column — always derived by `layMocHienTai(kyNang)`: the Mốc with the smallest `thuTu` whose `ngayHoanThanh` is still `null`. Returns `null` when every Mốc for that Kỹ năng is completed (terminal state).
- `hoanThanhMoc(mocId)` is the one and only write path for completing a Mốc, for both Kỹ năng. It rejects: an unknown `mocId`; a `mocId` that's already completed; a `mocId` that isn't currently `layMocHienTai()`'s result for its `kyNang` (no completing out of sequence); and — only when `kyNang === "TiengAnh"` — a `mocId` with no `BaiTestDanhGia` row yet (the gate). Automation Test never hits that last check.
- `BaiTestDanhGia` FKs to `Moc.id` (a real row already exists once seeded, so the FK is always satisfiable even before that Mốc is completed) and allows multiple rows per Mốc (retake history) — `diemSo` is free-form text (format intentionally left open per ARCHITECTURE-SPINE.md's Deferred section), always paired with the `mocId` it was entered against.
- Server Actions return `KetQua<T>` (`lib/ketQua.ts`), wrapped in `boiCanhGhi()`, same shape as every other module.
- The two Kỹ năng's Lộ trình are fully independent — completing/scoring one never reads or writes the other's rows.

**Ask First:** none — the exact card/list visual treatment for completed vs. current vs. future Mốc is ordinary UI implementation.

**Never:** no editing/reordering/adding Mốc (the 10 slots are permanently fixed); no un-completing a Mốc once marked (no "undo Hoàn thành" — mirrors the app's no-history-overwrite constraint); no automatic completion based on accumulated `BuoiHoc` thời lượng (explicit non-goal, FR-13); no dashboard integration (Story 11 doesn't exist yet); no dedicated Điểm số history list/view across all `BaiTestDanhGia` rows (deferred, see `deferred-work.md`) — this story shows/uses only the current Mốc's score existence, never a full history.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First visit, no Mốc seeded yet | empty `Moc` table | Lazy-seed creates all 10 rows; Automation Test shows Mốc 1 as current, Tiếng Anh shows A1 as current | N/A |
| Complete an Automation Test Mốc | `hoanThanhMoc(mocId)` for the current AutomationTest Mốc, no test needed | `ngayHoanThanh` set; `layMocHienTai` now returns the next Mốc | N/A |
| Complete a Tiếng Anh Mốc without a score yet | `hoanThanhMoc(mocId)` for current TiengAnh Mốc, zero `BaiTestDanhGia` rows for it | Rejected, gate error, `ngayHoanThanh` stays `null` | `CHUA_CO_DIEM_BAI_TEST` |
| Record a Điểm số, then complete | `ghiDiemBaiTest(diemSo)` for the current Tiếng Anh Mốc, then `hoanThanhMoc(mocId)` | Score row created; completion now succeeds | N/A |
| Complete out of sequence | `hoanThanhMoc(mocId)` for a Mốc that isn't the current one (future or already-completed) | Rejected, no state change | `MOC_KHONG_PHAI_VI_TRI_HIEN_TAI` |
| Try to complete an already-completed Mốc twice | `hoanThanhMoc(mocId)` called again on the same id | Rejected | `MOC_DA_HOAN_THANH` |
| All Mốc completed for a Kỹ năng | every row has `ngayHoanThanh` set | `layMocHienTai` returns `null`; UI shows a terminal "Đã hoàn thành Lộ trình" state, no current-Mốc card | N/A |
| Two Điểm số entered for the same Mốc | `ghiDiemBaiTest()` called twice before completing | Both rows persist (retake history, not shown as a list in this story); gate stays satisfied either way | N/A |
| Automation Test's score-entry path | any attempt to call `ghiDiemBaiTest()` in an Automation Test context | Not exposed in the UI for that column; the action itself always resolves against Tiếng Anh's current Mốc, never accepts a `kyNang` param | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` (`:261-295` current end of "Module Học tập") -- add `Moc { id, kyNang String, thuTu Int, ngayHoanThanh DateTime?, baiTestDanhGia BaiTestDanhGia[], @@unique([kyNang, thuTu]), @@index([kyNang]) }` and `BaiTestDanhGia { id, mocId Int, moc Moc @relation(onDelete: Cascade), diemSo String, ngay DateTime, @@index([mocId]) }`
- `app/hoc-tap/model.ts` (`:13` `KY_NANG` for the `as const`/`Record` pattern to mirror) -- add `MOC_TIENG_ANH`/`MOC_AUTOMATION_TEST` fixed arrays (`{ thuTu: number; ten: string }[]`, titles verbatim from `glossary.md`'s 7-item Automation Test roadmap and A1/A2/B1 for Tiếng Anh), a `LoTrinhDuLieu`/`MocDuLieu` read-shape type, `BaiTestDanhGiaDaGhi` type
- `app/lich-trinh/actions.ts` (`taoLichTrinhNgayTuMau()`, lazy day-init) -- reuse pattern (not code) for the Mốc lazy-seed function
- `app/hoc-tap/queries.ts` (`:30` `layThangSomNhatHocTap` for the module's existing query style) -- add `damBaoMocDaKhoiTao()` (idempotent upsert of the 10 fixed rows), `layMocHienTai(kyNang)`, `layLoTrinh(kyNang)` (full ordered Mốc list merging fixed titles + DB completion state; for Tiếng Anh, includes whether the current Mốc already has a `BaiTestDanhGia` row, not the full history)
- `app/hoc-tap/actions.ts` (`:72` `kiemTraBuoiHoc` for the validator style, `:83` `laKyNang()` reuse) -- add `hoanThanhMoc(mocId: unknown): Promise<KetQua<{ mocId: number }>>` and `ghiDiemBaiTest(diemSo: unknown): Promise<KetQua<BaiTestDanhGiaDaGhi>>`, both importing and calling `layMocHienTai()`/`damBaoMocDaKhoiTao()` from `queries.ts`
- `app/hoc-tap/page.tsx` (`:51-56` existing `Promise.all`) -- add `layLoTrinh("TiengAnh")`, `layLoTrinh("AutomationTest")` to the parallel reads, pass to `HocTapView`
- `app/hoc-tap/HocTapView.tsx` (`TienDoCot` ends `:184`, `.assign-grid`/`.assign-col` two-column pattern) -- append a `LoTrinhCot` per Kỹ năng column: completed-Mốc list, current-Mốc card with "Hoàn thành Mốc" button (Tiếng Anh: inline Điểm số input + gate-disabled button until a score exists for that Mốc), dimmed future Mốc, terminal "Đã hoàn thành Lộ trình" state — no history list in this story
- `app/globals.css` -- reuse `.task-row`/`.empty-txt`/`.badge-pri`/`.icon-btn` tokens; one new class for the dimmed "future Mốc" treatment if nothing existing fits
- `app/hoc-tap/actions.test.ts`, `app/hoc-tap/queries.test.ts` (existing files, extend) -- cover every I/O matrix row above

## Tasks & Acceptance

**Execution:**
- [ ] `prisma/schema.prisma` -- add `Moc`/`BaiTestDanhGia` models + run migration
- [ ] `app/hoc-tap/model.ts` -- fixed `MOC_TIENG_ANH`/`MOC_AUTOMATION_TEST` arrays + read-shape types
- [x] `app/hoc-tap/queries.ts` -- `damBaoMocDaKhoiTao()`, `layMocHienTai()`, `layLoTrinh()`
- [x] `app/hoc-tap/actions.ts` -- `hoanThanhMoc()`, `ghiDiemBaiTest()`
- [x] `app/hoc-tap/page.tsx` -- wire the new reads
- [x] `app/hoc-tap/HocTapView.tsx` -- `LoTrinhCot` (roadmap UI, no history list)
- [x] `app/globals.css` -- dimmed future-Mốc styling if needed
- [x] unit tests -- cover every I/O matrix row above

**Acceptance Criteria:**
- Given no other module's code, when grepped for `Moc`/`BaiTestDanhGia` (excluding the pre-existing `layMocNgayVN`/Vietnamese-word false positives), then only `app/hoc-tap/**` and `prisma/schema.prisma` reference them (AD-1 compliance).
- Given exactly one Server Action for completion, when grepped for `hoanThanhMoc`, then there is exactly one exported function by that name — no per-Kỹ-năng variants.
- Given an Automation Test Mốc, when `hoanThanhMoc()` is called for its current Mốc with zero `BaiTestDanhGia` rows anywhere, then it still succeeds (the gate only ever applies to Tiếng Anh).

## Design Notes

**Why `Moc` is pre-seeded (not sparse/event-only) and `LoTrinh` isn't a table:** the story's own naming guidance (`stories.yaml`) specifies `hoanThanhMoc(mocId)` — a signature that only makes sense if a `Moc` row already exists, with a stable id, before it's completed (so it can be looked up and mutated). That forces `Moc` to be pre-seeded for all 10 slots with a nullable `ngayHoanThanh`, rather than only inserting a row at completion time. `LoTrinh`, by contrast, has no independent data of its own beyond "which Kỹ năng" — exactly the same shape as `ThucDonNgay` in Story 7, which also turned out not to need its own physical table once its only content was which Kỹ năng/day it belonged to. The ERD's `KyNang ||--|| LoTrinh` and `LoTrinh ||--o{ Moc` relations are conceptual grouping, not a literal 1:1 physical table, the same reading already applied to `NhomKhauPhan` in Story 7.

**Why `BaiTestDanhGia` can be entered before a Mốc is completed:** the glossary defines it as a prerequisite ("làm bài test là điều kiện TRƯỚC KHI đánh dấu Hoàn thành"), and EXPERIENCE.md's milestone-gate note describes the score being entered inline in the current Mốc's card before its "Hoàn thành" button unlocks. Because `Moc` is pre-seeded, the not-yet-completed current Mốc already has a real `id` to attach a score to — no ordering conflict.

## Verification

**Commands:**
- `npm test` -- all pass, including extended `app/hoc-tap/*.test.ts`
- `npm run build` -- succeeds, no type errors

**Manual checks:**
- On `/hoc-tap`: confirm Automation Test starts at Mốc 1/7 and Tiếng Anh at A1/3. Complete Automation Test's Mốc 1 with no score needed; confirm it moves to Mốc 2. Try completing Tiếng Anh's A1 with no score entered; confirm it's rejected with a clear message. Enter a Điểm số for A1, confirm the button unlocks, complete it; confirm it moves to A2. Confirm Automation Test's progress is untouched by any of the above.

## Suggested Review Order

**The gate — `hoanThanhMoc()`'s single shared path**

- `hoanThanhMoc()` — rejects unknown/already-completed/out-of-sequence Mốc; only for Tiếng Anh, also requires a `BaiTestDanhGia` row.
  [`actions.ts:196`](../../../../app/hoc-tap/actions.ts#L196)

- Review-caught fix: the completion write is now an atomic `updateMany({ where: { id, ngayHoanThanh: null } })` + count-check, closing the double-completion race instead of a plain `update()`.
  [`actions.ts:248`](../../../../app/hoc-tap/actions.ts#L248)

- `ghiDiemBaiTest()` — always resolves against Tiếng Anh's current Mốc, never accepts a `kyNang` param, allows retake history.
  [`actions.ts:275`](../../../../app/hoc-tap/actions.ts#L275)

- Review-caught fix: `biChanHoanThanhBoiGateDiem()` extracted as a pure, unit-tested function — the button-disable logic can no longer silently drift from the gate's actual semantics.
  [`model.ts:161`](../../../../app/hoc-tap/model.ts#L161)

**Position derivation — one implementation, not two**

- `layMocHienTai()` — the sole "current Mốc" derivation: smallest `thuTu` with `ngayHoanThanh IS NULL`, never a stored pointer.
  [`queries.ts:174`](../../../../app/hoc-tap/queries.ts#L174)

- Review-caught fix: `layLoTrinh()` now calls `layMocHienTai()` instead of re-deriving current position independently.
  [`queries.ts:201`](../../../../app/hoc-tap/queries.ts#L201)

- Review-caught fix: `damBaoMocDaKhoiTao()` wrapped in React `cache()` so the 10-row lazy-seed runs once per request instead of on every call.
  [`queries.ts:145`](../../../../app/hoc-tap/queries.ts#L145)

**Data model — fixed vocabulary vs. real rows**

- `Moc` — pre-seeded, one row per fixed `(kyNang, thuTu)` slot, nullable `ngayHoanThanh`; `BaiTestDanhGia` FKs to it.
  [`schema.prisma:305`](../../../../prisma/schema.prisma#L305)

- `MOC_TIENG_ANH` / `MOC_AUTOMATION_TEST` — fixed titles/order, never stored in the DB (mirrors `KY_NANG`/`BUOI`'s pattern).
  [`model.ts:90`](../../../../app/hoc-tap/model.ts#L90)

**UI — the roadmap column**

- `LoTrinhCot` / `MocHienTaiCard` — completed (now with completion date), current (with the score gate for Tiếng Anh), and dimmed future Mốc.
  [`HocTapView.tsx:327`](../../../../app/hoc-tap/HocTapView.tsx#L327)

**Peripherals**

- Full I/O matrix coverage plus the new concurrent-completion race test.
  [`actions.test.ts`](../../../../app/hoc-tap/actions.test.ts)

