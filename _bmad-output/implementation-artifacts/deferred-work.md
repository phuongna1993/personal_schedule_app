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
