---
title: 'Story 12: Xem lịch sử Điểm số Bài test đánh giá (Test Score History)'
type: 'feature'
created: '2026-09-18'
status: 'done'
review_loop_iteration: 0
baseline_commit: '19b93c50604dcb0ecc40e55517bbd5f761ca03e2'
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-personal_phuongna-2026-08-20/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/glossary.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/stories/9-xem-tien-do-hoc-tap.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/stories/10-lo-trinh-va-moc.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/RETROSPECTIVE.md'
  - '{project-root}/_bmad-output/implementation-artifacts/deferred-work.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `BaiTestDanhGia` rows accumulate every time a Điểm số is entered for the Tiếng Anh gate (Story 10), but nothing lets them be reviewed as a history — CAP-12's second success criterion ("lịch sử Điểm số Bài test đánh giá của Tiếng Anh xem lại được theo thời gian") has been narrowed out twice (Story 9 → Story 10) and confirmed still unbuilt in the epic retrospective (`RETROSPECTIVE.md`, action item 5).

**Approach:** Add `layLichSuDiemBaiTest()` to `app/hoc-tap/queries.ts` — every `BaiTestDanhGia` row for Tiếng Anh (the only Kỹ năng with this concept), newest first, each paired with which Mốc it was entered against — and render it as a new list section inside `LoTrinhCot`'s Tiếng Anh column on `/hoc-tap`, below the existing Mốc roadmap. No schema change: `BaiTestDanhGia` already carries everything needed.

## Boundaries & Constraints

**Always:**
- `layLichSuDiemBaiTest()` takes no `kyNang` parameter — it is always and only Tiếng Anh's history, mirroring `ghiDiemBaiTest()`'s own established "no kyNang param, hardcoded to TiengAnh" discipline (Story 10) that makes misuse (accidentally scoping it to Automation Test, which has zero such rows) structurally impossible rather than just validated against.
- Read-only — this story adds no new Server Action and does not touch `ghiDiemBaiTest()`/`hoanThanhMoc()`.
- Every row shows which Mốc it was entered against (title, not just a raw id), reusing `MOC_TIENG_ANH`'s fixed title list the same way `layLoTrinh()` already does — never storing the title redundantly in the DB.
- The history list renders only inside the Tiếng Anh column of `LoTrinhCot` — Automation Test's column is untouched, never shows this section (mirrors every prior story's Kỹ-năng-independence rule).
- All reads go through this module's own `queries.ts` (AD-1).

**Ask First:** none — exact list item layout (one line vs. a small card per entry) is ordinary UI implementation.

**Never:** no editing or deleting a past `BaiTestDanhGia` entry (out of scope — this story is a read-only history view); no pagination/date-range filter (personal single-user app, a handful of entries expected — matches this codebase's established "no pagination at this data scale" precedent); no change to the completion-gate logic itself (Story 10, unchanged).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| No Điểm số ever entered | empty `BaiTestDanhGia` table | History section shows an empty-state hint, no crash | N/A |
| One Điểm số entered | one row for the current Mốc | Shows that Mốc's title + score + entry date | N/A |
| Multiple Điểm số for the same Mốc (retakes) | 2+ rows, same `mocId` | All rows appear, newest first — none hidden or merged | N/A |
| Điểm số entered across several completed Mốc | rows spanning Mốc A1 (done) and A2 (current) | History spans both, each row correctly labeled with its own Mốc's title | N/A |
| Automation Test column | any state | No history section rendered there at all — structural absence, not hidden | N/A |

</frozen-after-approval>

## Code Map

- `app/hoc-tap/queries.ts` (`layLoTrinh()` at `:205`, its `tenTheoThuTu` Map-from-`MOC_THEO_KY_NANG` pattern to reuse) -- add `layLichSuDiemBaiTest(): Promise<DiemBaiTestLichSu[]>`: `prisma.baiTestDanhGia.findMany({ where: { moc: { kyNang: "TiengAnh" } }, include: { moc: { select: { thuTu: true } } }, orderBy: [{ ngay: "desc" }, { id: "desc" }] })`, mapped through `MOC_TIENG_ANH`'s title lookup
- `app/hoc-tap/model.ts` (`BaiTestDanhGiaDaGhi` at `:142` -- do not modify, it's `ghiDiemBaiTest()`'s own return shape; `MOC_TIENG_ANH` for the title list) -- add a new `DiemBaiTestLichSu` type (`{ id, mocThuTu, mocTen, diemSo, ngay }`), distinct from `BaiTestDanhGiaDaGhi`
- `app/hoc-tap/page.tsx` (existing `Promise.all`) -- add `layLichSuDiemBaiTest()` to the parallel reads, pass to `HocTapView`
- `app/hoc-tap/HocTapView.tsx` (`LoTrinhCot` at `:327`) -- accept a new optional prop (populated only for the Tiếng Anh instance), render a small list section below the existing Mốc rows when `kyNang === "TiengAnh"`: `{mocTen} — {diemSo} ({formatNgayVN(ngay)})` per row, reusing `.task-row`/`.empty-txt` tokens already in scope
- `lib/ngayVn.ts` (`formatNgayVN`, already imported in `HocTapView.tsx`) -- reuse as-is
- `app/hoc-tap/queries.test.ts` (existing file, extend) -- cover every I/O matrix row above

## Tasks & Acceptance

**Execution:**
- [x] `app/hoc-tap/model.ts` -- `DiemBaiTestLichSu` type
- [x] `app/hoc-tap/queries.ts` -- `layLichSuDiemBaiTest()`
- [x] `app/hoc-tap/page.tsx` -- wire the new read
- [x] `app/hoc-tap/HocTapView.tsx` -- history list section in `LoTrinhCot`, Tiếng Anh only
- [x] unit tests -- cover every I/O matrix row above

**Acceptance Criteria:**
- Given no other module's code, when grepped for `layLichSuDiemBaiTest`, then only `app/hoc-tap/**` references it (AD-1 compliance).
- Given the Automation Test column, when inspecting its rendered output, then no history-list markup exists for it at all.
- Given 2 Điểm số entered for the same Mốc (a retake), when the history renders, then both appear as separate rows, newest first.

## Verification

**Commands:**
- `npm test` -- all pass, including new `layLichSuDiemBaiTest()` cases
- `npm run build` -- succeeds, no type errors

**Manual checks:**
- On `/hoc-tap`: enter a Điểm số for the current Tiếng Anh Mốc, save; confirm it appears in the new history section immediately below the roadmap. Enter a second Điểm số for the same Mốc; confirm both show, newest first. Confirm Automation Test's column has no history section at all.

## Suggested Review Order

**The new read — hardcoded to Tiếng Anh, mirroring the write path's discipline**

- `layLichSuDiemBaiTest()` — no `kyNang` param, filters `moc: { kyNang: "TiengAnh" }`, merges each row's title from `MOC_TIENG_ANH` (never stored in DB).
  [`queries.ts:278`](../../../../app/hoc-tap/queries.ts#L278)

- `DiemBaiTestLichSu` — new read-model type, distinct from `ghiDiemBaiTest()`'s own `BaiTestDanhGiaDaGhi`; carries the same "free-form text" caveat as the Prisma schema comment.
  [`model.ts:158`](../../../../app/hoc-tap/model.ts#L158)

- Review-caught fix: a write/read round-trip test confirms `ghiDiemBaiTest()` and `layLichSuDiemBaiTest()` — two independently-hardcoded "always Tiếng Anh" implementations — actually stay consistent with each other.
  [`actions.test.ts`](../../../../app/hoc-tap/actions.test.ts)

**UI — Tiếng Anh-only, structural absence for Automation Test**

- `LoTrinhCot` — `lichSuDiem` prop is `undefined` for every Automation Test instance, never just hidden.
  [`HocTapView.tsx:343`](../../../../app/hoc-tap/HocTapView.tsx#L343)

- `HocTapView` — passes `lichSuDiemBaiTest` only to the Tiếng Anh `LoTrinhCot` call.
  [`HocTapView.tsx:162`](../../../../app/hoc-tap/HocTapView.tsx#L162)

**Peripherals**

- Full I/O matrix coverage plus the tie-break, B1-title, and round-trip tests added in review.
  [`queries.test.ts`](../../../../app/hoc-tap/queries.test.ts)

