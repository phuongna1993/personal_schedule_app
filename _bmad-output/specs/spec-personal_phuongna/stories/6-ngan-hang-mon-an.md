---
title: 'Story 6: Dish Bank (Ngân hàng món ăn)'
type: 'feature'
created: '2026-09-11'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'a07d84b5c389401bda6ac517b81521f8bd68c6a7'
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-personal_phuongna-2026-08-20/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/EXPERIENCE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/mockups/meal-picker.html'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/glossary.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/stories.yaml'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There is no Ngân hàng món ăn yet — Món ăn (dish) data doesn't exist anywhere, so nothing can be built on top of it for future Thực đơn assignment (Story 7).

**Approach:** Stand up the `Module Thực đơn` (new, first module of its kind) with CRUD for Món ăn — each with tên, a list of Nguyên liệu (each with its own tên + optional photo), and an optional dish photo — rendered as the "Ngân hàng món ăn" card at `/thuc-don/chon-mon`, plus instant client-side filtering of the grid by one ingredient chip. This is the app's first image upload (AD-4): introduces `lib/resolveUploadPath.ts` and the GET-only `app/uploads/[...path]/route.ts`. The "Gán món cho Thực đơn ngày" assignment columns from the mock are explicitly Story 7's scope, not built here.

## Boundaries & Constraints

**Always:**
- Module Thực đơn owns `MonAn`/`NguyenLieu` exclusively (AD-1) — no other module's code reads/writes these models, and this module never imports another module's Prisma models.
- All writes (create/update/delete Món ăn, including file writes) go through Server Actions in `app/thuc-don/actions.ts` (AD-3); the only new route is the GET-only `app/uploads/[...path]/route.ts`.
- Images saved to disk under `app-data/uploads/`, DB stores only the relative path, both write-side and read-side go through one shared `lib/resolveUploadPath.ts` (AD-4) — mirror `lib/duongDanDb.ts`'s single-source-of-path-resolution style. Never store binary data in Prisma.
- Server Actions return `KetQua<T>` (`lib/ketQua.ts`, same `{ok:true,data}|{ok:false,error:{code,message,field?}}` shape every module already uses).
- Ingredient filter chip click is an instant client-side filter (no "Áp dụng" button, no server round-trip — all dishes/ingredients are already on the page); non-matching dishes get dimmed (`opacity`), never hidden (EXPERIENCE.md Component Patterns, DESIGN.md Do's/Don'ts).
- No confirm-delete dialog for removing a Món ăn or a Nguyên liệu row (app-wide convention, EXPERIENCE.md Interaction Primitives).
- New grid's edit/delete/save pending-state is scoped **per dish row** (e.g. `useTransition` keyed by `monAnId`), not one shared transition disabling every row — this exact bug is already logged three times in `deferred-work.md` (Stories 1-3); do not add a fourth occurrence in new code.

**Ask First:** none — file-size/type limits below are ordinary implementation defaults, not decisions needing a human gate.

**Never:** no Thực đơn assignment UI (`assign-grid`, `meal-slot`, `note-input`, "+ Thêm vào thực đơn" wiring) — that's Story 7; no image resizing/processing library (save the uploaded file as-is); no new `app/api/**/route.ts` CRUD endpoints.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First run, no Món ăn yet | empty `MonAn` table | Grid shows only the "+ Thêm món mới" add-dish-card | N/A |
| Add dish, no photos | tên + 2 nguyên liệu, no files | Dish appears in grid immediately, `anh: null` on dish and both ingredients | N/A |
| Add dish with photos | dish photo + one ingredient photo | Files saved under `app-data/uploads/`, grid renders `<img>` via `/uploads/...` path | N/A |
| Upload a non-image file | e.g. `.pdf` selected as dish photo | Save rejected, field-level error on the photo field, form stays open, no partial row written | `LOAI_FILE_KHONG_HOP_LE` |
| Edit dish: remove a nguyên liệu | existing dish, delete one ingredient row, save | Removed `NguyenLieu` row is deleted, not orphaned; remaining ones unaffected | N/A |
| Delete a Món ăn | dish with 2 nguyên liệu | Dish + its `NguyenLieu` rows removed (cascade); uploaded image files stay on disk (accepted orphan, no cleanup in v1) | N/A |
| Filter chip clicked | select ingredient "thịt bò", 2/7 dishes contain it | Matching dishes get accent border + "✓ khớp"; rest dim via `opacity`, all still visible; "Tất cả" clears filter | N/A |
| Filter matches zero dishes | select an ingredient no dish has | Neutral "Không có món nào chứa nguyên liệu này" + "Xoá bộ lọc" link (EXPERIENCE.md State Patterns) | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- add `MonAn { id, ten, anh String? }` + `NguyenLieu { id, ten, anh String?, monAnId, monAn @relation(onDelete: Cascade), @@index([monAnId]) }`, mirroring `DanhMucChiTieu`/`GiaoDich`'s Int-id + cascade + index shape and Vietnamese `///` doc-comment style; add a "Module Thực đơn" banner comment section like the existing "Module Chi tiêu" one
- `lib/db.ts` -- reuse as-is (`import { prisma } from "@/lib/db"`), no changes
- `lib/duongDanDb.ts` -- reuse pattern (not code) for the new path helper below
- `lib/resolveUploadPath.ts` (NEW) -- `resolveUploadPath(relativePath: string): string` joining `app-data/uploads/` + a validated relative path; single source used by both the write-side Server Action and the read-side route handler
- `app/uploads/[...path]/route.ts` (NEW) -- GET-only Route Handler, reads the file via `resolveUploadPath()` and streams it with the right `Content-Type` (AD-3 exception 1, AD-4)
- `app/chi-tieu/actions.ts`, `queries.ts`, `model.ts` -- reuse template: `boiCanhGhi()` try/catch wrapper, `KetQua<T>`/`thanhCong`/`thatBai` from `lib/ketQua.ts`, `revalidatePath` via a local `lamMoiManHinh()` helper, pure validation function before touching Prisma
- `app/globals.css` -- add a "Module Thực đơn" section reusing existing tokens (`--accent`, `--surface-raised`, `--border-hairline`, radius scale) for `.dish-grid`/`.dish-card`/`.dish-photo`/`.ing-list`/`.ing-chip`/`.add-dish-card`/`.filter-row`/`.filter-chip` (check whether Chi tiêu's `cat-chip` can be reused/generalized for `.filter-chip` before adding a near-duplicate)
- `app/thuc-don/model.ts` (NEW) -- shared `MonAn`/`NguyenLieu` UI-facing types
- `app/thuc-don/actions.ts` (NEW) -- `themMonAn`, `suaMonAn`, `xoaMonAn` as `FormData`-accepting Server Actions (native `File` entries can't cross a JSON-shaped `unknown` payload like other modules' actions do — this is the one intentional signature deviation from AD-3's usual pattern)
- `app/thuc-don/queries.ts` (NEW) -- `layDanhSachMonAn()` (with nested `nguyenLieu`), `layDanhSachNguyenLieuDuyNhat()` (distinct ingredient names, for filter chips)
- `app/thuc-don/chon-mon/page.tsx` (NEW) -- Server Component, `force-dynamic`, reads via `queries.ts`, renders `NganHangMonAnView`
- `app/thuc-don/chon-mon/NganHangMonAnView.tsx` (NEW) -- Client Component: filter-chip row (client-side filter over already-loaded data), dish grid, add/edit forms (native `<form action={...}>` to a `FormData` Server Action), per-row `useTransition` for delete
- `app/thuc-don/actions.test.ts`, `app/thuc-don/queries.test.ts` (NEW) -- cover every I/O matrix row above, following `app/chi-tieu/*.test.ts`'s location/naming convention

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` -- add `MonAn`/`NguyenLieu` models + run migration
- [x] `lib/resolveUploadPath.ts` -- shared upload path helper
- [x] `app/uploads/[...path]/route.ts` -- GET-only file-serving route
- [x] `app/thuc-don/model.ts`, `actions.ts`, `queries.ts` -- module scaffold + CRUD + filter query
- [x] `app/thuc-don/chon-mon/page.tsx`, `NganHangMonAnView.tsx` -- Ngân hàng món ăn screen
- [x] `app/globals.css` -- dish bank component styles
- [x] unit tests -- cover every I/O matrix row above

**Acceptance Criteria:**
- Given no other module's code, when grepped for `MonAn`/`NguyenLieu`, then only `app/thuc-don/**` and `prisma/schema.prisma` reference them (AD-1 compliance).
- Given a dish photo is uploaded, when the page re-renders, then the `<img>` src is a `/uploads/...` URL served by the new Route Handler, not a data URI or a direct `app-data/` path.
- Given the ingredient filter chip "Tất cả" is active by default, when a specific ingredient chip is clicked, then the filter changes instantly with no full-page navigation or loading state.

## Design Notes

No form UI exists yet in the mock (`add-dish-card` is only the trigger, not the expanded form) — layout is left to code, following the inline-expanding-form precedent from `app/chi-tieu/ChiTieuView.tsx`'s category-creation flow rather than inventing a new modal pattern (EXPERIENCE.md: no overlay chains beyond the one existing quick-add sheet).

Upload validation: accept `image/jpeg`, `image/png`, `image/webp`; reject anything else client-side (accept attr) and server-side (MIME sniff on the `File`, not just its name) with `LOAI_FILE_KHONG_HOP_LE`; cap at 5MB with `FILE_QUA_LON`. Filenames: `crypto.randomUUID()` + original extension under `mon-an/` and `nguyen-lieu/` subfolders — decoupled from DB row ids, so no create-then-rename ordering problem.

## Verification

**Commands:**
- `npm test` -- all pass, including new `app/thuc-don/*.test.ts`
- `npm run build` -- succeeds, no type errors

**Manual checks:**
- On `/thuc-don/chon-mon`: add a dish with a photo and two ingredients (one with its own photo); confirm both images render. Edit the dish to remove one ingredient; confirm it's gone after reload. Click an ingredient filter chip; confirm matching dishes get the accent border/"✓ khớp" and non-matching ones dim but stay visible. Delete the dish; confirm it disappears from the grid.

## Suggested Review Order

**Server Action signature — the one intentional AD-3 deviation**

- `FormData`-accepting Server Actions, not the usual `unknown`-JSON payload — native `File` objects can't cross a JSON-shaped boundary, explained inline.
  [`actions.ts:23`](../../../../app/thuc-don/actions.ts#L23)

**Image validation & storage — the app's first upload path (AD-4)**

- `layLoaiAnhTuNoiDung()` — MIME sniffed from magic bytes, never trusts client-reported `File.type` or filename extension.
  [`actions.ts:78`](../../../../app/thuc-don/actions.ts#L78)

- `kiemTraFileAnh()` — size + type validated and bytes read *before* any file/DB write, so a rejected upload leaves nothing partially written.
  [`actions.ts:104`](../../../../app/thuc-don/actions.ts#L104)

- `ghiFileAnh()` — `crypto.randomUUID()` filenames decouple the write from DB row ids, avoiding a create-then-rename ordering problem.
  [`actions.ts:137`](../../../../app/thuc-don/actions.ts#L137)

- `resolveUploadPath()` — single write/read path-resolution chokepoint shared by the Server Action and the Route Handler (AD-4).
  [`resolveUploadPath.ts:32`](../../../../lib/resolveUploadPath.ts#L32)

- `app/uploads/[...path]/route.ts` — GET-only Route Handler serving files back; the one sanctioned AD-3 exception, no write verbs.
  [`route.ts:25`](../../../../app/uploads/%5B...path%5D/route.ts#L25)

**Review-caught fix — real path-traversal gap found while writing its own test**

- `path.isAbsolute(relativePath)` checked explicitly before `path.join`, instead of relying on `path.join`'s incidental (not guaranteed) containment behavior for absolute-looking segments.
  [`resolveUploadPath.ts:42`](../../../../lib/resolveUploadPath.ts#L42)
  [`resolveUploadPath.test.ts`](../../../../lib/resolveUploadPath.test.ts)

**Review-caught fix — silent data loss on edit**

- `docHangNguyenLieu()` — clearing an existing ingredient's name (id present, no file) now returns `NGUYEN_LIEU_TEN_TRONG` instead of being silently dropped as a "blank placeholder row"; that skip now only fires for genuinely new (`id === null`) rows.
  [`actions.ts:199`](../../../../app/thuc-don/actions.ts#L199)

**Edit diffing — `suaMonAn`'s Nguyên liệu create/update/delete**

- One `$transaction` covering the Món ăn update plus all three Nguyên liệu operations — partial failure can't leave the dish and its ingredient rows out of sync.
  [`actions.ts:421`](../../../../app/thuc-don/actions.ts#L421)

- `suaMonAn()` — id ownership check rejects any `nguyenLieuId` not belonging to the Món ăn being edited before the transaction runs.
  [`actions.ts:349`](../../../../app/thuc-don/actions.ts#L349)

**Review-caught fix — row-count guard**

- `SO_NGUYEN_LIEU_TOI_DA` cap (30) gives a named `QUA_NHIEU_NGUYEN_LIEU` error instead of an opaque request-size failure once combined with per-file limits.
  [`actions.ts:180`](../../../../app/thuc-don/actions.ts#L180)

**UI — filter, grid, per-row pending state**

- `NganHangMonAnView` — client-side instant filter over already-loaded data, no server round-trip per chip click.
  [`NganHangMonAnView.tsx:55`](../../../../app/thuc-don/chon-mon/NganHangMonAnView.tsx#L55)

- `MonAnCard` — its own `useTransition()` instance per card, avoiding the shared-transition row-blocking bug already logged three times in `deferred-work.md` for Stories 1-3.
  [`NganHangMonAnView.tsx:216`](../../../../app/thuc-don/chon-mon/NganHangMonAnView.tsx#L216)

- `FormMonAn` — likewise its own `useTransition()`, independent of any card's pending state.
  [`NganHangMonAnView.tsx:337`](../../../../app/thuc-don/chon-mon/NganHangMonAnView.tsx#L337)

**Peripherals**

- `MonAn`/`NguyenLieu` models — Int id, cascade delete, indexed FK, Vietnamese doc-comments, mirroring `DanhMucChiTieu`/`GiaoDich`'s shape.
  [`schema.prisma:166`](../../../../prisma/schema.prisma#L166)

- `layDanhSachMonAn()` / `layDanhSachNguyenLieuDuyNhat()` — read-only, AD-1-scoped query exports for the module.
  [`queries.ts:19`](../../../../app/thuc-don/queries.ts#L19)

- `TrangChonMon()` — Server Component, `force-dynamic`, reads via `queries.ts` and hands data to the Client Component.
  [`page.tsx:29`](../../../../app/thuc-don/chon-mon/page.tsx#L29)

- `bodySizeLimit: "20mb"` — raised app-wide (not per-route) to fit multi-photo submissions; logged as a deferred consideration for future modules.
  [`next.config.ts:8`](../../../../next.config.ts#L8)

- Dish Bank component styles reusing Chi tiêu's `.cat-chip` for filter/ingredient chips instead of a near-duplicate class.
  [`globals.css:843`](../../../../app/globals.css#L843)
