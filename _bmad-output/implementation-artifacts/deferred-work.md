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
