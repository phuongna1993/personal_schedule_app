# Deferred Work

Append-only. Each entry is a real issue surfaced during a story's review that is not this story's problem to fix now.

## Triage index (added 2026-09-16, after Story 11 — reorganization only, no entries below were edited)

45 entries have accumulated across Stories 1–11. Most are deliberate, low-priority accepts for a single-user local app (AD-5); a handful are the *same* gap re-flagged story after story and are grouped here so a future pass can fix each pattern once instead of re-discovering it. Line numbers point at the first full entry text below — search for the `summary:` snippet quoted here to jump to every occurrence.

**A. Recurring code patterns — worth one shared fix across every screen, not a per-story patch**
- Shared `useTransition` blocks a whole row/list during any single row's pending action — flagged 3×: Story 1 (`TrinhSoanThaoMau`), Story 2 (`LichTrinhNgayView`), Story 3 (`ChiTieuView`). Later modules (6+) already use the correct per-row-keyed pattern — mirror that back onto these three.
- No re-entrancy guard on rapid double-submit — flagged in Story 3 (Giao dịch/Danh mục form), Story 8 (`KyNangForm`), Story 10 (Lưu điểm số / Hoàn thành Mốc buttons).
- Vietnamese-diacritic-aware sorting missing (SQLite binary collation, or JS `localeCompare()` with no `"vi"` locale) — Story 5 (`layBaoCaoThang`), Story 6 (`layDanhSachNguyenLieuDuyNhat`).
- No DB-level CHECK constraints backing Server-Action-only validation ("defense-in-depth, not reachable through any current write path") — Story 1 (`Task.ten`/`mucUuTien`), Story 3 (`GiaoDich` invariants), Story 4 (`NganSach.thang`), Story 8/9/10 (`kyNang` fallbacks, unreachable branches, `hanMuc<=0` guards). 6+ occurrences, all the same accepted class.
- Accessibility Floor gaps (missing `aria-describedby`/`aria-live`/`aria-pressed`/`aria-current`, skipped heading levels, no focus management after async updates) — Story 1, 3, 4, 6, 7, 10. Explicitly deferred since Story 1 to "one pass across all screens once more of them exist" — that condition is now true (11 screens exist).
- No component-level test infra (no jsdom/testing-library anywhere) — Story 1, 7, 8, 9, 10, 11. Affects every client component's interaction logic; the workaround used successfully in Stories 10-11 (extract branching logic into small pure functions in `model.ts` and unit-test those) is the cheapest mitigation without adding new infra.
- No `error.tsx`/try-catch on any read path — Story 6 (Verification Gap, confirmed pre-existing across chi-tieu/lich-trinh/thuc-don), Story 9, Story 11 (elevated stakes now that `/` is the sole entry point).
- Low-probability concurrent-write races specific to a single-user app (stale props across tabs, TOCTOU on delete-then-reference, multi-`Promise.all`-batch consistency) — Story 3, 4, 6, 7, 9, 10. Consistently accepted given AD-5; not worth fixing unless multi-device/multi-session use is ever added.

**B. Confirmed real bugs/gaps worth a dedicated look (not urgent, not theoretical)**
- `taoLichTrinhNgayTuMau()` throws a Next.js "used revalidatePath during render" error on the first render of a new day (Story 11) — reproduced on both `/lich-trinh` and `/`; the underlying write still succeeds, but a misleading error is logged daily.
- No way to clear an already-set value back to "unset" — Story 4 (Ngân sách hạn mức), Story 6 (Món ăn/Nguyên liệu photo).
- No duplicate-name prevention — Story 3 (Danh mục chi tiêu), Story 6 (Món ăn).
- Broken/orphaned upload handling — Story 6: no `onError` fallback for a missing image file, no cleanup of replaced/failed-write photos.

**C. Deliberate scope cuts — candidate future stories, not bugs**
- Multi-Món-ăn-per-meal-slot (Story 7 → deferred, single-dish-per-slot shipped instead).
- "Lịch sử Điểm số Bài test đánh giá" full history view for Tiếng Anh (deferred Story 9 → Story 10 → still not built; `BaiTestDanhGia` already supports it, no new schema needed).
- Full inline Dashboard interactivity matching the mock (quick-add sheet, inline Thực đơn/Buổi học/Task editing) — Story 11, narrowed twice to a read-only hub.

**D. Cosmetic/copy polish (low value, no correctness impact)**
- Theme-toggle icon flash + missing `suppressHydrationWarning` (Story 1); amount-input cursor jumps to end on every keystroke (Story 3); duplicate-looking totals shown twice on one screen with no explanation (Story 5); ambiguous "tháng này" wording without the actual month/year (Story 4); alert banners with no scroll-into-view (Story 4); a few under-specified empty-state messages that don't disambiguate their underlying cause (Story 5, 9).

---

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/13-nhap-gio-buoi-hoc.md`
  summary: When `ghiBuoiHoc()` rejects with `GIO_KET_THUC_KHONG_SAU_GIO_BAT_DAU`, the error is always attributed to the `gioKetThuc` field (both in the `KetQua.error.field` value and the resulting `aria-invalid` on the UI), even though the root cause could equally be a wrong `gioBatDau` — a user who mis-set the start time sees only the end-time field marked invalid.
  evidence: Blind Hunter + Edge Case Hunter both flagged it independently. `LoiAction`'s `field?: string` is singular by established app-wide convention (`lib/ketQua.ts`, used identically everywhere) — properly attributing blame to both fields would need a multi-field error shape, an app-wide convention change out of scope for this story.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/13-nhap-gio-buoi-hoc.md`
  summary: No test sends both `gioBatDau` and `gioKetThuc` simultaneously invalid (both empty, or both malformed) to confirm which error code surfaces first — the priority order (`gioBatDau` checked before `gioKetThuc`) is only inferable from reading the code.
  evidence: Blind Hunter finding; low value — the exact error-priority order isn't a behavior any Acceptance Criterion or I/O matrix row depends on, just an implementation detail.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/12-xem-lich-su-diem-bai-test.md`
  summary: `layLichSuDiemBaiTest()`'s `MOC_TIENG_ANH`-title fallback (`` `Mốc ${row.moc.thuTu}` `` for a `thuTu` not found in the fixed title list) has no test exercising it.
  evidence: Blind Hunter review finding; not reachable through any current write path — `Moc` rows are only ever seeded by `damBaoMocDaKhoiTao()` with the 3 fixed Tiếng Anh `thuTu` values (1-3), all present in `MOC_TIENG_ANH` — same class of "defense-in-depth gap, not reachable through any current write path" already accepted repeatedly in this file.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/12-xem-lich-su-diem-bai-test.md`
  summary: The new Điểm số history list gives no visual indicator that two rows for the same Mốc are separate retake attempts (e.g. "Lần 1"/"Lần 2") — a user sees two scores for "A1" with no in-UI cue they're sequential, not duplicate/erroneous entries.
  evidence: Blind Hunter review finding; real UX nicety, not required by the story's I/O matrix (which only required retakes to all appear, newest first, never hidden or merged — satisfied as-is).

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/12-xem-lich-su-diem-bai-test.md`
  summary: The new history section in `LoTrinhCot` (`app/hoc-tap/HocTapView.tsx`) uses a plain `<p className="field-label">` + `<div>` rows instead of a heading (`h3`/`h4`) or list semantics (`ul`/`li`), so it isn't navigable as its own landmark/list for screen readers.
  evidence: Blind Hunter review finding; same class of gap as the already-accepted Accessibility Floor backlog opened in Story 1 and added to by Stories 3/7/10 — a whole-app, pre-existing, explicitly-deferred concern, not unique to this story.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/RETROSPECTIVE.md`
  summary: `app/hoc-tap/queries.ts:17-19`'s re-export comment claims `model.ts` is "không bao giờ" (never) imported directly by the aggregation layer, which `app/DashboardView.tsx:6` (`laChuaCoHoatDongHocTap`) immediately contradicts.
  evidence: Epic retrospective, Architecture delta finding. Self-contradicting comment, not a functional defect — `DashboardView.tsx`'s own comment at lines 10-20 already documents this exact exception deliberately. Cheap wording fix: soften the "không bao giờ" claim to name the two carved-out pure-function exceptions.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/RETROSPECTIVE.md`
  summary: `formatTien()` (`app/chi-tieu/ChiTieuView.tsx:54-55`), an identical copy in `app/DashboardView.tsx:48-49`, and `formatPhut()` (`app/hoc-tap/HocTapView.tsx:38-39`) are three one-line number-formatting functions with the same body (`toLocaleString("vi-VN")`) instead of one shared `lib/` helper.
  evidence: Epic retrospective, Duplication map finding (delegated subagent, confirmed via file:line on all three). Zero behavioral risk, pure DRY cleanup.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/RETROSPECTIVE.md`
  summary: Threshold/validation constants duplicated across module boundaries, not just within one module: the Int32-overflow guard `2_147_483_647` is separately declared as `SO_TIEN_TOI_DA` (`app/chi-tieu/actions.ts:40`) and `THOI_LUONG_TOI_DA` (`app/hoc-tap/actions.ts:34`); `DO_DAI_GHI_CHU_TOI_DA = 200` is declared identically (same name, same value) in both `app/chi-tieu/actions.ts:43` and `app/thuc-don/actions.ts:495`.
  evidence: Epic retrospective, Duplication map finding. Same class of gap already caught and fixed once *within* Chi tiêu (the 30%-threshold constants, Story 11 review, consolidated into `app/chi-tieu/model.ts`) — recurs *across* modules here, uncaught until this epic-wide retro because no single story's review compares its new constants against sibling modules.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/RETROSPECTIVE.md`
  summary: `app/hoc-tap/actions.ts:208` uses error code `MOC_KHONG_TON_TAI` for a "fetch primary entity by id for update, not found" case — every earlier module uses `KHONG_TIM_THAY_<ENTITY>` for that exact scenario and reserves `_KHONG_TON_TAI` for validating a foreign reference before attaching it (a different scenario).
  evidence: Epic retrospective, Pattern divergence finding (delegated subagent, cross-referenced `xacNhanDanhMucTonTai`/`xacNhanMonAnTonTai` as the established foreign-reference-check convention). Naming-only, no functional impact.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/RETROSPECTIVE.md`
  summary: `model.ts` type-naming drift — `app/thuc-don/model.ts`'s `BuoiEnum` and `app/hoc-tap/model.ts`'s `KyNangEnum` add an "Enum" suffix that `app/lich-trinh/model.ts`'s `MucUuTien` and `app/chi-tieu/model.ts`'s `LoaiGiaoDich` don't use; `thuc-don/model.ts` is inconsistent with itself (`LoaiAnhHopLe` has no suffix in the same file as `BuoiEnum`).
  evidence: Epic retrospective, Pattern divergence finding. Cosmetic naming drift, no functional impact.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/RETROSPECTIVE.md`
  summary: Vietnamese-rooted CSS class names (`.nhan-uu-tien`, Story 1-2) disappear for Stories 3-9 (purely English kebab-case: `.badge-pri`, `.cat-chip`, `.dish-card`) then reappear in Story 10 (`.moc-future`, `.moc-current`).
  evidence: Epic retrospective, Pattern divergence finding. Cosmetic, zero functional impact, low priority.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/RETROSPECTIVE.md`
  summary: `app/chi-tieu/ChiTieuView.tsx` (835 lines, grew across Stories 3/4/5) and `app/thuc-don/chon-mon/NganHangMonAnView.tsx` (780 lines, Stories 6/7) have each accumulated 2-3 stories' worth of distinct concerns into one file — internally split into separate functions, but never split into separate files.
  evidence: Epic retrospective, God-component growth view (derived from `git_evidence.py`'s per-file churn plus current size/structure). No file is unmanageably large yet; worth a threshold-based splitting convention if the app keeps growing.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/RETROSPECTIVE.md`
  summary: Several Story-11-integration-layer UX papercuts found in the epic-wide adversarial review, none individually urgent: a long Thực đơn ghi-chú note has no CSS truncation inside a dense `.cat-chip` on the dashboard row (`app/DashboardView.tsx:321`); `/` (the sole entry point) renders no `<h1>` element unlike every other route (`DashboardView.tsx:111`); `app/chi-tieu/page.tsx:34` and `app/thuc-don/chon-mon/page.tsx:23` still carry a stale "Story 11 chưa build" doc comment, and none of the 4 module pages link back to `/`; the Dashboard's budget-alert summary has no persistent equivalent on the `/chi-tieu` page it links to, so the alert list a user just saw disappears on navigation.
  evidence: Epic retrospective, adversarial lens findings #5, #6, #7, #10 (`bmad-review`, weighted toward the Story 11 cross-module boundary). Consolidated into one batch entry since each is a small, independent polish item on the same new page.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/RETROSPECTIVE.md`
  summary: `DashboardView.tsx`'s terminal "Đã hoàn thành Lộ trình" state (`:410`) drops streak visibility entirely even when the user keeps logging sessions after finishing a Kỹ năng's roadmap — unlike the active-Mốc branch, which shows the streak badge.
  evidence: Epic retrospective, adversarial lens finding #8. Secondary to the two other `DongKyNang`/`laChuaCoHoatDongHocTap` findings routed as fix-now action items; bundle into the same future fix pass on that component.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/1-mau-lich-trinh.md`
  summary: Accessibility Floor gaps beyond what Story 1 implemented (aria-invalid/aria-describedby missing on the thoiHan input and priority radiogroup, inputs stay editable mid-submit, no live-region announcement when a Task is added/deleted).
  evidence: EXPERIENCE.md's Accessibility Floor is an adopted companion the spec commits to matching; better tackled as one pass across all screens once more of them exist than piecemeal per story.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/1-mau-lich-trinh.md`
  summary: Theme toggle shows the wrong icon for a split second on first paint for dark-mode users, and `<html>` has no `suppressHydrationWarning` even though an inline script mutates `data-theme` before hydration.
  evidence: Edge Case Hunter + Blind Hunter both flagged it independently; real but purely cosmetic for a personal single-user tool, not worth a mid-story fix.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/1-mau-lich-trinh.md`
  summary: No DB-level CHECK constraint or max length on `Task.ten` / `Task.mucUuTien` — only the Server Action layer validates, so a row written any other way (future script, manual DB edit) isn't guarded.
  evidence: Defense-in-depth gap, not reachable through any current write path since Server Actions are the only writer (AD-3).

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/1-mau-lich-trinh.md`
  summary: `.task-row:last-of-type` CSS selector is fragile — the visual separator moves to the wrong row when the last item becomes the inline edit form or the list is empty.
  evidence: Blind Hunter finding; cosmetic, low-frequency trigger, cheap to revisit alongside a later visual pass.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/1-mau-lich-trinh.md`
  summary: `lib/db.ts` runs `fs.mkdirSync` as an import-time side effect and sets no explicit SQLite pragmas (`foreign_keys`, `busy_timeout`, `journal_mode=WAL`) on the connection.
  evidence: Blind Hunter finding; matters more once multiple modules/tables and any concurrent access exist — revisit once Story 2+ start sharing `lib/db.ts` in earnest.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/1-mau-lich-trinh.md`
  summary: `package.json`'s `allowScripts` block references `@lavamoat/allow-scripts`, which is absent from devDependencies, and pins an exact `better-sqlite3` version narrower than the declared `^` range — will silently stop matching on the next minor bump.
  evidence: Blind Hunter finding; doesn't break the current install, but is a latent maintenance trap worth a cleanup pass.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/2-lich-trinh-ngay.md`
  summary: `LichTrinhNgayView`'s check-off/edit/delete buttons all share one global `useTransition`, so any single row's pending action disables every other row's checkbox and buttons until it resolves.
  evidence: Blind Hunter finding; identical pre-existing pattern in Story 1's `TrinhSoanThaoMau`, so it's a cross-story UX rough edge rather than something unique to this story — better fixed once, across both screens, than twice.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/7-len-thuc-don-ngay.md`
  summary: No component-level test coverage for the new `GanThucDonNgayView`/`NguoiLonSlot`/`BeSlot`/`ChonMonSelect` client components in `app/thuc-don/chon-mon/NganHangMonAnView.tsx` — only the underlying Server Actions and queries are unit-tested.
  evidence: Blind Hunter review finding; no component-test infra (jsdom/@testing-library) exists anywhere in the project yet, same accepted gap already logged for Story 1's `TrinhSoanThaoMau` and every subsequent story's client components — not unique to Story 7.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/7-len-thuc-don-ngay.md`
  summary: `xacNhanMonAnTonTai()` then a separate `upsert()` call in `luuThucDonNguoiLon`/`luuThucDonBe` (`app/thuc-don/actions.ts`) has a narrow TOCTOU gap — a Món ăn deleted between the two calls surfaces as generic `LOI_HE_THONG` instead of `MON_AN_KHONG_TON_TAI`.
  evidence: Edge Case Hunter review finding; this exact check-then-write shape mirrors `xacNhanDanhMucTonTai()` in `app/chi-tieu/actions.ts` (explicitly cited as the mirrored pattern in code comments), so the same narrow race already exists pre-Story-7 in the Chi tiêu module — not a new regression.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/7-len-thuc-don-ngay.md`
  summary: Per-slot error text (`<p className="field-error" role="alert">`) in `NguoiLonSlot`/`BeSlot` isn't linked via `aria-describedby` to the dish `<select>`/note `<input>` it belongs to.
  evidence: Blind Hunter review finding; the same unlinked pattern is already the dominant convention across `app/chi-tieu/ChiTieuView.tsx` and most of `app/lich-trinh/LichTrinhNgayView.tsx` (only one of four existing occurrences links via an `id`) — a pre-existing, app-wide inconsistency, not introduced by this story.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/7-len-thuc-don-ngay.md`
  summary: `app/thuc-don/chon-mon/page.tsx`'s `searchParams: Promise<{ ngay?: string }>` typing doesn't guard against a duplicated `?ngay=` query key, which Next.js would deliver as a string array at runtime.
  evidence: Edge Case Hunter review finding; this is an exact, deliberate mirror of `app/lich-trinh/page.tsx`'s identical existing signature/pattern (Boundaries: "Day scoping mirrors `app/lich-trinh/page.tsx`'s existing pattern exactly") — pre-existing across the app, not a new gap.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/7-len-thuc-don-ngay.md`
  summary: Two near-simultaneous writes to the same slot (e.g. a note-save transition racing a dish-change transition on the same `(ngay, buoi)`) could clobber each other, since both go through a full-row `upsert` with no optimistic concurrency check.
  evidence: Blind Hunter review finding; low real-world likelihood in a single-user, single-session local app (AD-5), and the same class of unguarded-concurrent-write gap is already accepted for Stories 1-3's shared-`useTransition` findings in this file.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/8-ghi-buoi-hoc.md`
  summary: `dinhDangBuoiHoc()` (`app/hoc-tap/actions.ts`) silently falls back to `"TiengAnh"` when a `BuoiHoc` row's `kyNang` column fails `laKyNang()` instead of surfacing an error or logging a warning.
  evidence: Blind Hunter review finding; not reachable through any current write path since `ghiBuoiHoc()` (the only writer, AD-3) already validates `kyNang` before insert — same class of "defense-in-depth gap, not reachable through any current write path" already accepted for `Task.ten`/`GiaoDich.soTien` elsewhere in this file.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/8-ghi-buoi-hoc.md`
  summary: The thời lượng input's `e.target.value.replace(/\D/g, "")` handler in `app/hoc-tap/HocTapView.tsx` silently mangles a typed decimal (e.g. "30.5" becomes "305") instead of rejecting or truncating at the decimal point.
  evidence: Edge Case Hunter / Blind Hunter finding; this is an exact, deliberate mirror of the identical `replace(/\D/g, "")` pattern already used for `soTien` inputs in `app/chi-tieu/ChiTieuView.tsx` (both are Int-only fields with no fractional unit) — pre-existing app-wide behavior, not a new regression.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/8-ghi-buoi-hoc.md`
  summary: No component-level test coverage for the new `HocTapView`/`KyNangForm` client components in `app/hoc-tap/HocTapView.tsx` — only the underlying `ghiBuoiHoc()` Server Action is unit-tested.
  evidence: Blind Hunter review finding; no component-test infra (jsdom/@testing-library) exists anywhere in the project, same accepted gap already logged for Story 1's and Story 7's client components — not unique to Story 8.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/8-ghi-buoi-hoc.md`
  summary: In `ghiBuoiHoc()` (`app/hoc-tap/actions.ts`), if `revalidatePath()` throws after `prisma.buoiHoc.create()` has already committed, `boiCanhGhi()`'s catch reports `LOI_HE_THONG` even though the row was actually written, inviting an unnecessary resubmit.
  evidence: Edge Case Hunter finding; this exact write-then-revalidate-in-the-same-try-block shape is used identically by every other module's create actions (`app/chi-tieu/actions.ts`, `app/thuc-don/actions.ts`) — a pre-existing, app-wide pattern, not introduced by this story.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/8-ghi-buoi-hoc.md`
  summary: `noiDung`'s empty-check in `kiemTraBuoiHoc()` only calls `.trim()`, so a string made entirely of zero-width characters (e.g. U+200B) passes as "non-empty" and gets stored as a visually-blank Buổi học.
  evidence: Edge Case Hunter finding; the identical `.trim()`-only emptiness check is used for every free-text field across the app (`app/chi-tieu/actions.ts`'s `ten`/`ghiChu`, `app/thuc-don/actions.ts`'s `ten`) — pre-existing, systemic, not unique to Story 8.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/8-ghi-buoi-hoc.md`
  summary: `KyNangForm` in `app/hoc-tap/HocTapView.tsx` has no guard against two near-simultaneous submits before `dangGui`/`disabled` takes effect, which could create two `BuoiHoc` rows for one intended save.
  evidence: Blind Hunter / Edge Case Hunter finding; the same unguarded double-submit shape (disable-on-pending via `useTransition`, no explicit re-entrancy guard) is already the established pattern across every other module's forms (`MonAnCard`, `FormMonAn`, `NguoiLonSlot`, `BeSlot`) — pre-existing, not new to this story.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/11-dashboard-hom-nay.md`
  summary: Full inline interactivity on the Dashboard matching `mockups/dashboard.html` exactly — a floating quick-add Giao dịch sheet, inline Thực đơn assignment, and inline Ghi buổi học, all editable directly from Hôm nay without navigating to the module page. Story 11 is narrowed to read-only summary cards plus reusing the existing Task check-off action (the one interactive element kept, since it's a single cheap existing action call); every other module's editing stays on its own page, reached via a "Xem/Sửa →" link from its card.
  evidence: Building the mock's full inline interactivity would re-implement significant chunks of UI already built on `/chi-tieu`, `/thuc-don/chon-mon`, and `/hoc-tap`, pushing this integration story's spec past even Story 10's size while mostly duplicating existing code. Human chose the leaner scope explicitly when asked, prioritizing a clean read-only hub over 1:1 mock fidelity — the "một lượt quét mắt" (one-glance) requirement is satisfied by the summary cards alone; deep editing was never gated on being on-page.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/11-dashboard-hom-nay.md`
  summary: `layCanhBaoNganSachHienTai()` (`app/chi-tieu/queries.ts`) and the mirrored progress-bar-width calc in `app/DashboardView.tsx`'s `KhoiCanhBaoDanhMuc` both divide by `ns.hanMuc`/`canhBao.hanMuc` with no `=== 0` guard — a zero-or-negative `hanMuc` would produce `NaN`/`Infinity` shown directly in the UI.
  evidence: Blind Hunter / Edge Case Hunter finding; not reachable through any current write path — `kiemTraHanMuc()` in `app/chi-tieu/actions.ts:443-447` already rejects `hanMuc <= 0` before any `NganSach` row can be written — same class of "defense-in-depth gap, not reachable through any current write path" already accepted repeatedly throughout this file.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/11-dashboard-hom-nay.md`
  summary: `app/page.tsx` queries the `NganSach` table twice for the same month — once via `layDanhMucVoiHanMucThangHienTai()` (to derive whether any budget is set at all) and once via `layCanhBaoNganSachHienTai()` (for active warnings) — two small overlapping reads instead of one.
  evidence: Blind Hunter finding; negligible overhead in a single-user local SQLite app at this data scale, and combining them would require reshaping an existing, already-tested Story 3/4 query — not worth the risk for a purely internal efficiency gain.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/11-dashboard-hom-nay.md`
  summary: `app/page.tsx` awaits all module reads in one flat `Promise.all` with no `Suspense`/streaming and no `error.tsx` for the route — one failing or slow module read blocks or crashes the entire hub instead of degrading gracefully per-card.
  evidence: Edge Case Hunter / Blind Hunter finding; matches the app-wide convention (zero `error.tsx`/try-catch-on-reads anywhere in the app, confirmed in Story 9's review) but carries more weight now that `/` is literally "điểm vào duy nhất của app" (the story's own doc comment) — worth a focused resilience pass if this ever becomes a real problem for a single local SQLite file with no network dependency.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/11-dashboard-hom-nay.md`
  summary: The warning-list sort in `layCanhBaoNganSachHienTai()` has an `a.danhMucChiTieuId - b.danhMucChiTieuId` tie-break for equal-name categories that no test exercises.
  evidence: Blind Hunter finding; `DanhMucChiTieu.ten` has no unique constraint (already a known, separately-logged gap from Story 3), so two same-named categories are possible in principle but low-probability in a single-user app that controls its own input.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/11-dashboard-hom-nay.md`
  summary: `taoLichTrinhNgayTuMau()` (`app/lich-trinh/actions.ts`) can throw a Next.js "used revalidatePath during render" error on the FIRST render of a new day, because it's called unconditionally at the top of a Server Component's render (`page.tsx`) rather than in response to a user-triggered mutation. `boiCanhGhi()` catches it and logs to console, and the underlying Prisma write already succeeded before the throw, so the page still renders correctly — but a misleading error is logged every day's first load.
  evidence: Reproduced identically on both `/lich-trinh` (pre-existing, Story 2) and now `/` (Story 11, which reuses the exact same call pattern per this story's own Boundaries forbidding changes to `lich-trinh/actions.ts`) — confirmed pre-existing, not a regression introduced by this story. Worth a focused fix (e.g. moving the lazy-init off the render path, or wrapping the revalidate call) if the noisy log recurs enough to matter.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/11-dashboard-hom-nay.md`
  summary: Reusing `danhDauTask()` for inline Task check-off directly on the Dashboard — narrowed out on a second pass; Story 11 is now fully read-only (every card links out to its module page for any write, including checking off today's Task).
  evidence: Keeping even this one reused, already-existing action pushed the spec to ~2944 tokens; human chose to narrow further rather than accept the size, given this is the final integration story and simplicity here reduces risk. `danhDauTask()` itself is unchanged and already reachable from `/lich-trinh` — nothing is lost, just not duplicated onto the hub.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/10-lo-trinh-va-moc.md`
  summary: Several accessibility gaps in the new Lộ trình UI (`app/hoc-tap/HocTapView.tsx`): no `aria-current` on the current-Mốc card, no `aria-disabled`/accessible label on dimmed future Mốc rows, the completed-Mốc checkmark has no text alternative, the Điểm số input has no `aria-describedby` linking it to its `field-error`, and focus isn't programmatically restored to the new current-Mốc card after a completion re-render.
  evidence: Blind Hunter review finding; same class of gap as the already-accepted "Accessibility Floor" backlog opened in Story 1 and added to by Stories 3/7 (category chips, error-text linkage) — a whole-app, pre-existing, explicitly-deferred concern, not unique to this story. Better tackled as one pass across all screens once more of them exist (per Story 1's original deferral reasoning) than piecemeal per story.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/10-lo-trinh-va-moc.md`
  summary: No overall progress indicator (e.g. "2/7 Mốc hoàn thành") in `LoTrinhCot` even though the count is trivially available from already-loaded data.
  evidence: Blind Hunter review finding; a real, cheap-ish UX enhancement but not required by any Acceptance Criterion or I/O matrix row — pure polish, not core correctness.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/10-lo-trinh-va-moc.md`
  summary: `BaiTestDanhGia.mocId`'s foreign key isn't DB-restricted to only `Moc` rows where `kyNang = "TiengAnh"` — the gate is purely application-level in `ghiDiemBaiTest()` (which always hardcodes `layMocHienTai("TiengAnh")`), so nothing at the schema layer stops a future code path or manual DB edit from attaching a score to an Automation Test Mốc.
  evidence: Edge Case Hunter / Blind Hunter finding; not reachable through any current write path since `ghiDiemBaiTest()` is the only writer (AD-3) and never accepts a `kyNang` parameter — same class of "defense-in-depth gap, not reachable through any current write path" already accepted repeatedly elsewhere in this file (e.g. `Task.ten`, `dinhDangBuoiHoc()`'s `kyNang` fallback).

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/10-lo-trinh-va-moc.md`
  summary: `hoanThanhMoc()`'s defensive `laKyNang(moc.kyNang)` branch (an unexpected `kyNang` value read back from the DB) has no test exercising it — dead code as far as the suite can currently prove.
  evidence: Blind Hunter finding; not reachable through any current write path, since every `Moc` row is created exclusively by `damBaoMocDaKhoiTao()`'s fixed, hardcoded `(kyNang, thuTu)` pairs — same class of accepted defense-in-depth gap as above.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/10-lo-trinh-va-moc.md`
  summary: A narrow race between `ghiDiemBaiTest()` resolving "the current Tiếng Anh Mốc" and its `BaiTestDanhGia.create()` landing, versus a concurrent `hoanThanhMoc()` call advancing that same Mốc in between — the score could end up attached to a Mốc that completed a moment earlier instead of the new current one. Separately, the "Lưu điểm số" and "Hoàn thành Mốc" buttons use independent pending flags, so both are clickable at once.
  evidence: Edge Case Hunter finding; requires precise timing in what's a single-user, single-session local app (AD-5), and even if triggered the consequence is harmless (a valid historical score row attached to the wrong-by-one Mốc, not data loss or corruption) — same low-priority class as other unguarded-concurrent-write gaps already accepted for Stories 1-9.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/10-lo-trinh-va-moc.md`
  summary: A dedicated "lịch sử Điểm số Bài test đánh giá" view (all `BaiTestDanhGia` entries across all Mốc, newest first) for Tiếng Anh — narrowed out of Story 10, which now only shows/uses a Mốc's score inline (enough to drive the completion gate), not a full history list. This is the second half of CAP-12's original scope, originally deferred from Story 9 to Story 10.
  evidence: Keeping `layLichSuDiemBaiTest()` and its UI section in Story 10 pushed the spec to ~3777 tokens — the largest yet, on top of already being the highest-risk-logic story (`spec_checkpoint=true` in `stories.yaml`). Human chose to split rather than accept the size, keeping the gate/seed/roadmap logic (which is tightly coupled and risky) isolated from the history-viewing UI (which is not). A future story should add `layLichSuDiemBaiTest()` (all `BaiTestDanhGia` for Tiếng Anh, newest first) plus a history list in the UI — no new schema needed, `BaiTestDanhGia` already supports it.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/9-xem-tien-do-hoc-tap.md`
  summary: No distinct empty state for "this Kỹ năng has never had a single Buổi học" vs. "just no sessions in the currently-viewed month" — both render the same streak-0/total-0/empty-list state in `TienDoCot` (`app/hoc-tap/HocTapView.tsx`).
  evidence: Blind Hunter review finding; would need a new per-Kỹ-năng "has any session ever" query beyond what this story's Code Map scoped, and the current shared empty state isn't incorrect, just less nuanced — not worth the added query surface for this pass.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/9-xem-tien-do-hoc-tap.md`
  summary: `app/hoc-tap/page.tsx` fires `layThangSomNhatHocTap()`/`tinhStreak()` and, after clamping, `layLichSuThang()` as two separate `Promise.all` batches — a `BuoiHoc` row written between the two batches could leave the streak/earliest-month figures and the rendered month history momentarily inconsistent with each other.
  evidence: Edge Case Hunter / Blind Hunter finding; low-probability in a single-user, single-session local app (AD-5), and the same class of unguarded-multi-read-consistency gap is already accepted for other stories' independent-`Promise.all`-reads patterns in this file.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/9-xem-tien-do-hoc-tap.md`
  summary: No error handling (try/catch or an `error.tsx` boundary) on the new read path (`layLichSuThang()`/`tinhStreak()`/`layThangSomNhatHocTap()`) — a Prisma failure while loading `/hoc-tap` throws uncaught inside the Server Component.
  evidence: Edge Case Hunter finding; confirmed systemic and pre-existing — no module's read-side queries anywhere in the app (`app/chi-tieu/queries.ts`, `app/lich-trinh/queries.ts`, `app/thuc-don/queries.ts`) are wrapped in try/catch, and no `error.tsx`/`global-error.tsx` exists anywhere in `app/` — not introduced by this story.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/9-xem-tien-do-hoc-tap.md`
  summary: When `layThangSomNhatHocTap()` returns `null` (no `BuoiHoc` at all yet), `app/hoc-tap/page.tsx`'s clamp only enforces the "never future" bound — an arbitrary past `?thang=` renders unclamped instead of snapping to the current month.
  evidence: Edge Case Hunter finding; this is a byte-for-byte mirror of `app/chi-tieu/page.tsx`'s identical `thangSomNhat !== null` clamp shape (Story 5) — pre-existing, deliberately reused pattern, not a new gap.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/9-xem-tien-do-hoc-tap.md`
  summary: `tinhStreak()` compares `BuoiHoc.ngay` values via raw `.getTime()` against `layMocNgayVN()`-normalized lookback days, without re-normalizing the read rows itself — correct only as long as every row was written pre-normalized.
  evidence: Edge Case Hunter finding; not reachable through any current write path, since `ghiBuoiHoc()` (Story 8, the only writer, AD-3) already always stamps `ngay` via `layMocNgayVN()` before insert — same class of "defense-in-depth gap, not reachable through any current write path" already accepted elsewhere in this file (e.g. `dinhDangBuoiHoc()`'s `kyNang` fallback).

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/9-xem-tien-do-hoc-tap.md`
  summary: "Lịch sử Điểm số Bài test đánh giá theo thời gian cho Tiếng Anh" (part of CAP-12) — narrowed out of Story 9, which now covers only the Buổi học history/tổng thời lượng/streak-or-chart portion of CAP-12 for both Kỹ năng.
  evidence: Per ARCHITECTURE-SPINE.md's Structural Seed, `BaiTestDanhGia` always attaches to a specific `Moc`, and a score is only ever entered at the point of trying to complete that Mốc (EXPERIENCE.md's milestone-gate note) — there is no free-floating test score. `Moc`/`LoTrinh` don't exist until Story 10, so no `BaiTestDanhGia` data can exist for Story 9 to show. Human confirmed: build the score-entry + score-history UI together in Story 10, at the same milestone-completion gate, rather than inventing an early/duplicate scoring flow in Story 9.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/8-ghi-buoi-hoc.md`
  summary: Displaying the running tổng thời lượng per Kỹ năng on the `/hoc-tap` screen — narrowed out of Story 8, which now covers only CAP-11 (ghi Buổi học); the total/lịch sử/streak view is explicitly CAP-12's job (Story 9, "Xem tiến độ học tập").
  evidence: SPEC.md's own CAP split already separates "ghi" (CAP-11) from "xem tổng thời lượng/lịch sử" (CAP-12) — same ghi-vs-xem boundary already used between Story 3 (CAP-4, ghi Giao dịch) and Story 5 (CAP-7, xem báo cáo) in this project. Keeping the totals query/UI in Story 8 pushed the spec to ~2575 tokens; human chose to narrow rather than accept the size, and the cut also produces a cleaner CAP boundary, not just a smaller spec.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/7-len-thuc-don-ngay.md`
  summary: Allowing multiple Món ăn per meal slot (e.g. rice + stir-fry together for one bữa, matching the mock's comma-joined "Cơm, Bò xào thập cẩm" cell and the ARCHITECTURE-SPINE.md ERD's `NhomKhauPhan }o--o{ MonAn` many-to-many notation) — narrowed out of Story 7, which now assigns exactly one Món ăn per (ngày, bữa, Nhóm khẩu phần) slot.
  evidence: The multi-dish design (plus its knock-on effect of denormalizing the CAP-10 adjustment note across every dish-row of a slot) pushed the spec to ~3206 tokens, well over the 1600 target. Human chose Split [S] to narrow to single-dish-per-slot rather than accept the size, since it also simplifies the UI (single dropdown instead of multi-select) and removes the note-duplication design wrinkle entirely.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/3-ghi-chi-tieu-ngan-sach.md`
  summary: Full Danh mục chi tiêu management (rename/delete) and Ngân sách per-category-per-month budgeting (CAP-5) — narrowed out of Story 3, which now covers CAP-4 (Giao dịch logging) only with minimal inline category creation.
  evidence: Combined CAP-4+CAP-5 spec measured ~2846 tokens (cl100k estimate), well over the 900-1600 target — risks context rot for the implementation agent. CAP-4 and CAP-5 are already distinct capabilities in SPEC.md, and Giao dịch logging only strictly needs categories to exist (creatable), not full CRUD + budgeting, making this a natural rather than artificial split. Human chose Split [S] over accepting the oversized single spec.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/3-ghi-chi-tieu-ngan-sach.md`
  summary: No duplicate-category-name prevention — `DanhMucChiTieu.ten` has no unique constraint and `themDanhMuc()` only checks for empty/whitespace, so two categories named e.g. "Ăn uống" can coexist and split totals.
  evidence: Blind Hunter + Edge Case Hunter both flagged it; not in the story's frozen I/O matrix, low severity for a single-user app that controls its own input — worth a light validation pass later rather than blocking this story.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/3-ghi-chi-tieu-ngan-sach.md`
  summary: No DB-level CHECK constraint on `GiaoDich`'s `soTien > 0` / Chi-requires-category / Thu-requires-null-category invariants — enforced only in the Server Action validator.
  evidence: Same class of gap already accepted for Story 1's `Task.ten`/`Task.mucUuTien` in this file; not reachable through any current write path since Server Actions are the only writer (AD-3). Consistent precedent, not urgent.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/3-ghi-chi-tieu-ngan-sach.md`
  summary: Category chips (`.cat-chip` in `ChiTieuView.tsx`) have no `aria-pressed`/`aria-checked` selected-state announcement, unlike the Loại giao dịch radiogroup which does this correctly; no `aria-invalid` tie-in when `DANH_MUC_BAT_BUOC` fires.
  evidence: Blind Hunter finding; falls under the same Accessibility Floor gap already deferred from Story 1 ("better tackled as one pass across all screens once more of them exist than piecemeal per story").

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/3-ghi-chi-tieu-ngan-sach.md`
  summary: Editing or adding a Giao dịch with a `ngay` outside the current calendar month makes it silently disappear from `/chi-tieu`'s list (which only reads `[dauThang, dauThangKeTiep)`), with no warning that this will happen.
  evidence: Blind Hunter + Edge Case Hunter both flagged it. This is a foreseeable, accepted consequence of deferring CAP-7 (past-month report/browsing) to Story 5 — EXPERIENCE.md's quick-add component pattern already establishes the date field is freely editable, so the fix (a neutral inline warning, or a Story-5-time reconsideration) fits naturally once that story's screen exists rather than as a standalone fix now.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/3-ghi-chi-tieu-ngan-sach.md`
  summary: `ChiTieuView.tsx`'s edit/delete actions share one global pending-transition, so any single row's in-flight save/delete disables every other row's Sửa/Xoá buttons; switching to edit a different row while a save is still pending can also silently drop that save's error onto an already-abandoned form.
  evidence: Blind Hunter + Edge Case Hunter both flagged it. Third occurrence of the exact cross-row-blocking pattern already logged for Story 1 (`TrinhSoanThaoMau`) and Story 2 (`LichTrinhNgayView`) in this file — confirms it's worth one shared fix across all three screens rather than three separate patches.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/3-ghi-chi-tieu-ngan-sach.md`
  summary: The `soTien` amount input fully re-formats (`toLocaleString`) on every keystroke with no cursor-position preservation, so editing a digit in the middle of an already-entered amount snaps the caret to the end.
  evidence: Blind Hunter finding; cosmetic input-UX papercut, functional correctness unaffected, low frequency (most edits re-type the whole amount).

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/3-ghi-chi-tieu-ngan-sach.md`
  summary: No re-entrancy guard on form submission — a rapid double-click or double-Enter before React's `disabled` state re-renders can fire two submits, creating a duplicate Giao dịch or Danh mục.
  evidence: Edge Case Hunter finding; standard React double-submit race, low probability and low consequence (an accidental duplicate row the user can delete, no corruption). Worth folding into the same pending-state cleanup pass as the shared-transition finding above.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/3-ghi-chi-tieu-ngan-sach.md`
  summary: If a user selects an existing category chip while a just-triggered inline "tạo danh mục mới" create request is still pending, the resolving create's callback can overwrite the manual selection once it completes.
  evidence: Edge Case Hunter finding; narrow timing window, single-user app, low practical likelihood and low consequence (user notices wrong category selected, can correct it).

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/4-canh-bao-ngan-sach-30.md`
  summary: Full Ngân sách overview UI (đã chi + % còn lại per Danh mục, at a glance across every category at once) — narrowed out of Story 4, which now covers CAP-6 minimally (set/edit current month's hạn mức per category + inline threshold alert on the transaction form only, no persistent multi-category overview).
  evidence: Combined CAP-5+CAP-6 draft measured ~2518 tokens (cl100k), well over the 900-1600 target. The deferred overview is functionally the same surface CAP-7/Story 5 ("Xem báo cáo chi tiêu theo tháng") already covers, so building it there avoids duplicating the same per-category spend breakdown twice. Human chose Split [S] over accepting the oversized spec.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/4-canh-bao-ngan-sach-30.md`
  summary: The budget alert's copy hardcodes "trong tháng này" / "tháng hiện tại", but `tinhCanhBaoNganSach()` actually scopes to the month of the saved transaction's own `ngay` — a backdated or postdated Chi can trigger an alert labeled "this month" for a month that isn't the real calendar-current one, with no month field on `CanhBaoNganSach` to disambiguate.
  evidence: Blind Hunter finding. Same class of gap already accepted for Story 3 ("editing/adding a Giao dịch with a ngay outside the current month silently disappears from the list, accepted as a foreseeable consequence of deferring CAP-7") — fits naturally alongside that fix once Story 5's past-month browsing exists.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/4-canh-bao-ngan-sach-30.md`
  summary: `HangHanMuc`'s hạn mức input seeds its value from props only once via `useState(danhMuc.hanMuc ?? 0)`, so it won't resync if the same category's server-side hạn mức changes elsewhere (another tab, a stale revalidate) without a full page reload.
  evidence: Blind Hunter + Edge Case Hunter both flagged it independently. Single-user, one-machine app (AD-5) makes the multi-tab drift window narrow and low-consequence — same risk class as Story 3's inline-category-selection race already deferred.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/4-canh-bao-ngan-sach-30.md`
  summary: No way to clear/remove an already-set hạn mức once entered — `datHanMucNganSach` rejects any `hanMuc<=0`, and `HangHanMuc` only offers a "Lưu" button, never a path back to "no limit this month."
  evidence: Blind Hunter finding. Not required by CAP-5/CAP-6's minimum scope (set/edit only); worth adding once the full Ngân sách overview (already deferred above) is built.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/4-canh-bao-ngan-sach-30.md`
  summary: `HangHanMuc` gives no success feedback after saving a hạn mức — only the error path (`loi`) renders anything; a successful "Lưu" just re-enables the button with no confirmation the value persisted.
  evidence: Blind Hunter finding. Budget-setting isn't one of the "ba thao tác ghi nhanh hàng ngày" (EXPERIENCE.md) that mandate instant confirmation feedback, so this is a UX polish gap, not a spec violation.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/4-canh-bao-ngan-sach-30.md`
  summary: The hạn mức input in `HangHanMuc` isn't wrapped in a `<form onSubmit>` and has no Enter-key handling — the user must locate and click the small "Lưu" button, unlike the app's other forms.
  evidence: Blind Hunter finding; minor interaction-pattern inconsistency, cheap to fix alongside a later UI-consistency pass.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/4-canh-bao-ngan-sach-30.md`
  summary: No DB-level CHECK constraint enforces `NganSach.thang` is always a first-of-month value — correctness depends entirely on every write path consistently calling `layMocDauThangVN()`.
  evidence: Blind Hunter finding; same accepted class of gap already logged for `Task.ten`/`Task.mucUuTien` (Story 1) and `GiaoDich`'s Chi/Thu invariants (Story 3) — not reachable through any current write path since Server Actions are the only writer (AD-3).

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/4-canh-bao-ngan-sach-30.md`
  summary: The "Hạn mức tháng này" section never states which month/year it is actually editing (e.g. "Tháng 9/2026") — it only says "tháng hiện tại" in prose, ambiguous right at a month boundary.
  evidence: Blind Hunter finding; low-cost copy polish, not blocking correctness.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/4-canh-bao-ngan-sach-30.md`
  summary: When a budget alert appears after editing a transaction row well below the fold, there's no scroll-into-view or focus management — the banner renders back up near the "Ghi giao dịch" form and the user may never notice it.
  evidence: Blind Hunter finding; cosmetic UX gap, same severity class as other papercuts already deferred from Stories 1-3.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/4-canh-bao-ngan-sach-30.md`
  summary: `KhoiCanhBaoNganSach` renders an `<h4>` directly under the page's `<h2>` sections with no intervening `<h3>`, skipping a heading level for assistive-technology users.
  evidence: Blind Hunter finding; same Accessibility Floor gap already deferred from Stories 1 and 3 ("better tackled as one pass across all screens once more of them exist").

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/4-canh-bao-ngan-sach-30.md`
  summary: Editing a transaction's date to move it into a different month only recomputes/shows budget status for the destination month; the origin month's budget status (which may have just changed because the transaction left it) is never recomputed or surfaced.
  evidence: Blind Hunter finding; same accepted risk class as the already-deferred "editing across months" Story 3 gap — alerts are ephemeral (shown only at save time), so the origin month isn't being viewed at the moment it changes.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/5-xem-bao-cao-chi-tieu-theo-thang.md`
  summary: On the default (current-month, no `?thang=`) view of `/chi-tieu`, `layGiaoDichThangHienTai()` and `layBaoCaoThang()` both independently query the exact same month's `GiaoDich`, computing the same `tongChi`/`tongThu` twice via two separate DB round-trips instead of reusing one result when `laThangHienTai` is true.
  evidence: Blind Hunter finding; negligible cost at this app's scale (SQLite, single user, one month of rows), but a real avoidable duplicate query on the most common page load.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/5-xem-bao-cao-chi-tieu-theo-thang.md`
  summary: `layBaoCaoThang`'s `chiTietDanhMuc` doc comment claims "cùng quy ước `layDanhSachDanhMuc()`" (same sort convention), but `layDanhSachDanhMuc()` sorts via DB collation (`orderBy: {ten:"asc"}`) while `layBaoCaoThang` sorts in JS with `localeCompare()` (no `"vi"` locale argument) — the two can order Vietnamese diacritics differently, and the JS sort's exact result depends on the Node runtime's ICU build.
  evidence: Blind Hunter finding; cosmetic ordering discrepancy between two lists on the same page, low practical likelihood of a visible mismatch for this app's small category counts.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/5-xem-bao-cao-chi-tieu-theo-thang.md`
  summary: `/chi-tieu`'s page subtitle text ("Ghi nhanh một Giao dịch Chi/Thu · xem lại và sửa log tháng này") wasn't updated to mention the new "Báo cáo tháng" capability, even though the surrounding JSDoc comment above the component was.
  evidence: Blind Hunter finding; copy-only gap, doesn't affect functionality.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/5-xem-bao-cao-chi-tieu-theo-thang.md`
  summary: On the default (current-month) view, the new "Báo cáo tháng" card shows `tongChi`/`tongThu` numerically identical to the "Giao dịch tháng này" summary rendered just above it, with nothing in the UI explaining why the same two totals appear twice on one screen.
  evidence: Blind Hunter finding; same root duplication as the query-level gap above, but a UX-clarity concern rather than a performance one — worth a copy/layout pass once the report section has been used for a while.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/5-xem-bao-cao-chi-tieu-theo-thang.md`
  summary: The report's empty-state message ("Chưa có Giao dịch Chi nào theo Danh mục trong tháng này") is shown for at least three different underlying situations (truly no transactions, a Thu-only month, or a Chi-only-but-uncategorized month) without distinguishing them, even though `tongChi`/`tongThu` are available in the same component to disambiguate.
  evidence: Blind Hunter finding; minor UX polish, not blocking correctness.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/6-ngan-hang-mon-an.md`
  summary: Replacing a Món ăn's or Nguyên liệu's photo during edit never deletes the old file on disk, and a photo written to disk during `themMonAn`/`suaMonAn` can be left orphaned if the Prisma write after it then fails — a stricter version of the same accepted-orphan class the story's own I/O matrix already allows for "Delete a Món ăn".
  evidence: Blind Hunter + Edge Case Hunter both flagged it independently. Consistent with the app's already-accepted "no upload cleanup in v1" non-goal (story Design Notes), not worth blocking this story to add cleanup logic for a single-user local tool.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/6-ngan-hang-mon-an.md`
  summary: No way to clear an already-set Món ăn/Nguyên liệu photo back to "no photo" — editing only supports keep-old-photo or replace-with-new-photo, never remove-without-replacing.
  evidence: Blind Hunter finding; ảnh is optional at creation time (can be skipped entirely), so this only matters for someone who added a photo and later wants it gone — minor, not required by CAP-8's minimum scope.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/6-ngan-hang-mon-an.md`
  summary: `next.config.ts`'s `serverActions.bodySizeLimit: "20mb"` is a global Next.js config, so it also raises the request-size ceiling for every other module's Server Actions (Chi tiêu, Lịch trình), not just Thực đơn's image uploads.
  evidence: Blind Hunter finding; raised specifically to fit multiple 5MB Nguyên liệu photos in one `themMonAn`/`suaMonAn` submission — no per-route override exists in this Next.js version, and no other module needs anywhere near 1MB today, so the wider ceiling is low-risk but worth knowing about if a future module adds its own upload.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/6-ngan-hang-mon-an.md`
  summary: Ingredient-name matching (filter chips in `layDanhSachNguyenLieuDuyNhat` and the dish-card match check) is case-sensitive with no normalization — "Thịt bò" and "thịt bò" entered on two different Món ăn produce two separate filter chips instead of one.
  evidence: Blind Hunter finding; low practical impact for a single user who tends to type consistently, but a real UX rough edge worth a normalization pass (e.g. lowercase-compare) later.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/6-ngan-hang-mon-an.md`
  summary: `layDanhSachNguyenLieuDuyNhat()`'s `orderBy: { ten: "asc" }` sorts via SQLite's default binary collation, not Vietnamese-diacritic-aware — same class of gap already accepted for `layDanhSachDanhMuc()` in Story 5.
  evidence: Blind Hunter finding; consistent, low-severity, pre-existing-pattern gap, not a new risk introduced by this story alone.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/6-ngan-hang-mon-an.md`
  summary: The instant ingredient-filter result text ("N/M món phù hợp" / the zero-match message) is not wrapped in an `aria-live`/`role="status"` region, so a screen-reader user isn't told when a client-side filter click changes the visible results.
  evidence: Blind Hunter finding; same Accessibility Floor gap class already deferred from Stories 1, 3, and 4 ("better tackled as one pass across all screens once more of them exist").

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/6-ngan-hang-mon-an.md`
  summary: No duplicate-Món-ăn-name prevention — two dishes can share the exact same `ten`, same as the already-accepted gap for `DanhMucChiTieu.ten` in Story 3.
  evidence: Blind Hunter finding; not in this story's frozen I/O matrix, low severity for a single-user app that controls its own input.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/6-ngan-hang-mon-an.md`
  summary: `suaMonAn`/`xoaMonAn` read the current row via `findUnique` before validating/transacting, with no re-check inside the transaction — a concurrent edit or delete of the same Món ăn between the read and the write (e.g. two browser tabs) can act on a stale snapshot.
  evidence: Edge Case Hunter finding; same accepted risk class as Story 4's `HangHanMuc` stale-props gap already deferred — single-user, one-machine app (AD-5) makes the multi-tab window narrow and low-consequence.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/6-ngan-hang-mon-an.md`
  summary: Opening the add-dish form while the edit form (or another add) is already open with unsaved input, or vice versa, silently discards whatever was typed in the form that was open — no warning.
  evidence: Edge Case Hunter finding; consistent with the app's no-confirm-dialog philosophy elsewhere, but this is an implicit context-switch rather than an explicit Huỷ/scrim click, so the data loss is less expected than the app's other no-confirm cases.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/6-ngan-hang-mon-an.md`
  summary: A dish/ingredient `<img>` whose stored `anh` path no longer resolves to a file on disk (e.g. manually deleted from `app-data/uploads/`) shows the browser's default broken-image icon instead of falling back to the neutral 🍽 placeholder used for `anh: null`.
  evidence: Edge Case Hunter finding; no `onError` handler on the `<img>` elements. Narrow trigger (requires manual filesystem tampering outside the app), cosmetic consequence.

- source_spec: `_bmad-output/specs/spec-personal_phuongna/stories/6-ngan-hang-mon-an.md`
  summary: None of `app/thuc-don/page.tsx`, `app/chi-tieu/page.tsx`, or `app/lich-trinh/page.tsx` wrap their server-side data-loading `Promise.all`/query calls in try/catch, and no `app/error.tsx` boundary exists anywhere in the repo — a DB read failure on any page crashes to Next.js's generic default error screen.
  evidence: Verification Gap Reviewer finding, confirmed pre-existing and identical across all three module pages (not introduced or worsened by this story) — first time a review has surfaced it, worth one shared fix later rather than a per-page patch now.
