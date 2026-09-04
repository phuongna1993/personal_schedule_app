# Deferred Work

Append-only. Each entry is a real issue surfaced during a story's review that is not this story's problem to fix now.

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
