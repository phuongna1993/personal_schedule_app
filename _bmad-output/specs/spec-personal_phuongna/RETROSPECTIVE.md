---
date: 2026-09-17
verdict: accepted-with-open-items
criteria: profiled
headless: false
---

# Retrospective — App Quản Lý Cá Nhân Đa Năng

## Epic summary

**Spec folder:** `_bmad-output/specs/spec-personal_phuongna/`
**Stories:** 11, in `stories.yaml` list order, all `done`. No unfinished stories — the completeness gate passed without needing a human override.

| # | Story | CAP(s) | Commit |
|---|---|---|---|
| 1 | Mẫu lịch trình | CAP-1 | (no VCS evidence — see below) |
| 2 | Lịch trình ngày | CAP-2, CAP-3 | `bfb574c` |
| 3 | Ghi chi tiêu | CAP-4 | `c02f25d` |
| 4 | Cảnh báo ngân sách 30% | CAP-5 (minimal), CAP-6 | `d44843b` |
| 5 | Xem báo cáo chi tiêu theo tháng | CAP-7 | `a07d84b` |
| 6 | Ngân hàng món ăn | CAP-8 | `868a2dc` |
| 7 | Lên thực đơn ngày | CAP-9, CAP-10 | `d593841` |
| 8 | Ghi buổi học | CAP-11 | `aa786d4` |
| 9 | Xem tiến độ học tập | CAP-12 (partial) | `9f1e0ec` |
| 10 | Lộ trình & Mốc | CAP-13 (partial) | `aef573b` |
| 11 | Dashboard Hôm nay | integration, no CAP | `fa69d8b` |

**Diff range:** `51cc0ef5d19822b39ef5ea9754f4430d01c50366..fa69d8b1ef6c04a0d999f5949f904f225e0a53c2` (Story 2's baseline through Story 11's final commit = current `HEAD`), measured via `git_evidence.py`: 10 commits, 0 merges, 57 files touched.

**Evidence inventory:**

| Input | Status |
|---|---|
| SPEC.md | Present — 13 capabilities (CAP-1..CAP-13), 7 constraints, 8 non-goals. No single "epic accepted when X" statement; each CAP carries its own `success:` line. Verdict below is **profiled** from these, not a declared epic-level criterion. |
| stories.yaml + 11 story files | Present, all `status: done`, each with `baseline_commit` and (for 8-11) a `Suggested Review Order` documenting review-caught fixes. |
| Diff range and commits | Present for Stories 2-11 (`git_evidence.py`, see above). **Story 1 has `baseline_commit: 'NO_VCS'`** in its own frontmatter — its implementation predates this repo's git history, so it carries no commit-level attribution or diff evidence in this retro. Its spec file (intent, boundaries, I/O matrix, Code Map) is still available and was read. |
| `git_evidence.py` story attribution | **Unreliable for this repo, corrected manually.** The script attributes commits to story ids by word-boundary substring match against each commit subject. Every commit subject here also ends in a `(CAP-N)` suffix (e.g. "Story 7: ... (CAP-9/CAP-10)"), so a commit's own CAP number(s) collide with the id-matching heuristic whenever a CAP number falls in the 2-11 story-id range — e.g. the Story 11 commit ("...all 4 modules...") spuriously matched id `4`; the Story 6 commit ("...CAP-8") spuriously matched id `8`. The true mapping is one commit per story in strict list order, independently confirmed by each story's `baseline_commit` forming an unbroken chain (each story's baseline equals the previous story's final commit) — used in the table above instead of the script's raw `stories` field. |
| Sprint status | N/A — stories mode, no `sprint-status.yaml` exists for this project. |
| Previous retrospective | None — this is the first retrospective for this spec. |
| Session logs | No separate session-log artifact exists (checked `_bmad-output/**/*.memlog.md`; only the SPEC-authoring phase's `.memlog.md` files exist, covering PRD/UX/architecture/brief creation and the initial story breakdown, not the 11 stories' individual implementation sessions). Process-lesson analysis below draws instead on each story's `Suggested Review Order` (review-caught fixes) and `deferred-work.md` (accumulated, unfixed findings) — the closest available proxy — and this narrowing is noted wherever it limits a finding. |

## Findings

Grouped by aggregate view, then by code-review lens. Each finding carries its source and a disposition: **fix now** (routed to Action items), **defer** (real, low-priority, added to `deferred-work.md`), or **accept** (matches a deliberate, documented decision — no action).

### Architecture delta

Delegated to a subagent tracing every cross-module import against AD-1 ("each module owns its own Prisma models exclusively; only reachable through its own `queries.ts`/`actions.ts`").

- **Checked, clean:** no module's `actions.ts`/`queries.ts`/`model.ts` imports another module's Prisma-touching file, in any direction (`app/{lich-trinh,chi-tieu,thuc-don,hoc-tap}/*.ts`, zero cross-`@/app/` matches). `app/page.tsx` imports only `queries.ts` functions plus the one sanctioned `taoLichTrinhNgayTuMau()`. No `model.ts` imports Prisma/`@/lib/db`/`@prisma/client`. No `lib/*.ts` imports from `app/`. All 4 modules have the full `queries.ts`/`actions.ts`/`model.ts` triad.
- **`app/DashboardView.tsx:4,6`** — imports `xacDinhTrangThaiNganSach()`/`laChuaCoHoatDongHocTap()` directly from `./chi-tieu/model` and `./hoc-tap/model`, not `queries.ts`. Both are pure, Prisma-free functions, and the code self-documents this as a deliberate exception (mirroring the pattern this same retrospective's Story 10 review established for `biChanHoanThanhBoiGateDiem()`). **Disposition: accept** — deliberate, reviewed, documented at the time.
- **`app/hoc-tap/queries.ts:17-19`** — its own re-export comment claims model.ts is "không bao giờ" (never) imported directly by the aggregation layer, which `DashboardView.tsx:6` immediately contradicts for `laChuaCoHoatDongHocTap`. **Disposition: defer** (self-contradicting comment, cheap wording fix, not a functional defect) — added to `deferred-work.md`.

### Duplication map

Delegated to a subagent comparing near-identical logic across all 4 modules.

- **Checked, clean:** the 4 modules' day/month-scoped `?param=` clamp logic is one pattern reused verbatim (with one documented, non-duplicative exception in Thực đơn). `KetQua`/`thanhCong`/`thatBai` are one true shared implementation (`lib/ketQua.ts`); each module's private `boiCanhGhi()` wrapper is deliberately parallel, not drifted. The per-row `useTransition` pending-state pattern is applied identically everywhere it's needed.
- **Number formatting duplicated 3×, not extracted to `lib/`:** `formatTien()` (`app/chi-tieu/ChiTieuView.tsx:54-55`), an identical copy in `app/DashboardView.tsx:48-49` (explicitly comments it's mirroring the other two), and `formatPhut()` (`app/hoc-tap/HocTapView.tsx:38-39`) — three one-line functions with the same body (`toLocaleString("vi-VN")`) instead of one `lib/` helper. **Disposition: defer** (cosmetic/DRY, zero behavioral risk — added to `deferred-work.md`).
- **Threshold constants duplicated across module boundaries:** the Int32-overflow guard `2_147_483_647` is separately named and declared in `app/chi-tieu/actions.ts:40` (`SO_TIEN_TOI_DA`) and `app/hoc-tap/actions.ts:34` (`THOI_LUONG_TOI_DA`); `DO_DAI_GHI_CHU_TOI_DA = 200` is declared identically (same name, same value) in both `app/chi-tieu/actions.ts:43` and `app/thuc-don/actions.ts:495`. Each pair carries a "mirror" comment acknowledging the other but was never consolidated to `lib/`. This is the same pattern already caught and fixed once within Chi tiêu itself (the 30%-threshold constants, Story 11 review) — here it recurs *across* modules, uncaught until now. **Disposition: defer** (cross-module constant consolidation is a real but low-urgency cleanup — added to `deferred-work.md`, called out explicitly as the same class of gap that was already fixed once, so a future pass should do it everywhere at once).

### Pattern divergence

Delegated to a subagent comparing conventions established by earlier modules against later ones.

- **Error code naming:** `app/hoc-tap/actions.ts:208` uses `MOC_KHONG_TON_TAI` for a "fetch primary entity by id for update, not found" case — every earlier module uses `KHONG_TIM_THAY_<ENTITY>` for that exact scenario (`KHONG_TIM_THAY_TASK`, `KHONG_TIM_THAY_GIAO_DICH`, `KHONG_TIM_THAY_MON_AN`) and reserves `_KHONG_TON_TAI` for a different scenario (validating a foreign reference before attaching it, e.g. `xacNhanDanhMucTonTai`/`xacNhanMonAnTonTai`). **Disposition: defer** (naming-only, no functional impact, cheap to rename — added to `deferred-work.md`).
- **Test structure:** `app/hoc-tap/actions.test.ts` restructures to one `describe` per *scenario* (6 describes for `ghiBuoiHoc` alone) where every other module's `actions.test.ts` uses one `describe` per *function*. All `queries.test.ts` files stayed consistent. **Disposition: accept** — both shapes are valid Vitest organization, the scenario-per-describe style arguably reads better against an I/O matrix; not worth a mechanical revert.
- **`model.ts` type naming:** `thuc-don/model.ts`'s `BuoiEnum` and `hoc-tap/model.ts`'s `KyNangEnum` add an "Enum" suffix; `lich-trinh/model.ts`'s `MucUuTien` and `chi-tieu/model.ts`'s `LoaiGiaoDich` don't — and `thuc-don/model.ts` is inconsistent with itself (`LoaiAnhHopLe`, no suffix, same file as `BuoiEnum`). **Disposition: defer** (cosmetic naming drift — added to `deferred-work.md`).
- **Route structure:** `app/thuc-don` has no top-level `page.tsx` — its only route lives one directory deeper at `chon-mon/page.tsx`, the sole module without a route at its own root. `TrinhSoanThaoMau` (`app/lich-trinh/mau-lich-trinh/`) is the only Client Component without a "View" suffix. **Disposition: accept** — both are traceable to real, documented decisions (the dish-bank route name came from the UX mock; `TrinhSoanThaoMau` predates the "View" convention as Story 1's first component) rather than unexplained drift.
- **CSS naming:** Vietnamese-rooted class names (`.nhan-uu-tien`, Story 1-2) disappear for Stories 3-9 (purely English kebab-case: `.badge-pri`, `.cat-chip`, `.dish-card`) then reappear in Story 10 (`.moc-future`, `.moc-current`). **Disposition: defer** (cosmetic, zero functional impact — added to `deferred-work.md`).

### God-component growth

Computed directly from `git_evidence.py`'s per-file churn (Phase 1) plus current file size/structure.

| File | Current size | Stories that touched it | Top-level functions |
|---|---|---|---|
| `app/globals.css` | 1266 lines | 8 of 10 commits | n/a (stylesheet) |
| `prisma/schema.prisma` | 348 lines | 8 of 10 commits | n/a (schema) |
| `app/chi-tieu/ChiTieuView.tsx` | 835 lines | 3 (Stories 3, 4, 5) | 7 |
| `app/thuc-don/chon-mon/NganHangMonAnView.tsx` | 780 lines | 2 (Stories 6, 7) | 9 |
| `app/DashboardView.tsx` | 438 lines | 1 (Story 11 alone) | 11 |
| `app/hoc-tap/HocTapView.tsx` | 516 lines | 3 (Stories 8, 9, 10) | 7 |

`globals.css` and `schema.prisma` growing across nearly every story is expected and architecturally accepted (ARCHITECTURE-SPINE.md's Deferred section explicitly chose a bespoke CSS system with no component library, and every module owns its own Prisma models). `ChiTieuView.tsx` and `NganHangMonAnView.tsx` are the real candidates: each accumulated 2-3 stories' worth of distinct concerns (quick-add form + transaction list + budget card + monthly report; dish-bank CRUD + filter + assign-grid) into one ever-growing file, each internally split into separate functions (mitigating readability) but never split into separate *files*. `DashboardView.tsx` reaching 438 lines / 11 functions in a single story is the steepest one-story jump, though still below the other two in absolute size.

**Disposition: defer.** No file is unmanageably large yet, and each internally follows the established per-row/per-card component-splitting convention. Worth a threshold-based splitting convention (e.g. "extract to a sibling file once a View exceeds ~2 stories' worth of additions") if the app keeps growing — added to `deferred-work.md`.

### Spec-to-implementation reconciliation

- **CAP-12's second success criterion is unmet:** SPEC.md declares CAP-12's success as "Mỗi Kỹ năng hiển thị đúng ít nhất một trong hai hình thức streak hoặc biểu đồ theo thời gian; **lịch sử Điểm số Bài test đánh giá của Tiếng Anh xem lại được theo thời gian**" (SPEC.md, CAP-12). The first half is built (streak, Story 9). The second half — a score-history view — was deferred Story 9 → Story 10, and Story 10 narrowed it out a second time (`deferred-work.md`, Story 10 & 9 entries). Confirmed absent from the current codebase (`grep -rn "layLichSuDiemBaiTest\|LichSuDiem" app/` returns nothing). This is not a silent gap — both narrowings are explicitly recorded with reasoning and a follow-up pointer (`BaiTestDanhGia` already supports it, no new schema needed) — but it is a real, currently-unmet piece of the frozen SPEC. **Disposition: this is the single finding that drives the acceptance verdict below** (see Acceptance verdict).
- Every other CAP-1 through CAP-13 has at least one story whose spec cites it and whose `Acceptance Criteria` were independently verified during that story's own review pass; no other silent scope drop was found in the 45 `deferred-work.md` entries or the story specs read for this retro.
- All 8 of SPEC.md's declared non-goals held throughout: no multi-user/account features, no mobile-responsive work, no active notification channel, no export/backup format — none of these appeared anywhere across 11 stories' Code Maps or diffs.

### Code-review lenses (adversarial, edge-case, verification-gap)

Run via `bmad-review` over the full epic diff (`51cc0ef..fa69d8b`), weighted toward cross-story boundaries — specifically the Story 11 aggregation layer (`app/page.tsx`/`app/DashboardView.tsx`) reading from all 4 modules, since no single story's own review ever saw both sides of that boundary. Findings already present in `deferred-work.md` were excluded by each lens.

**Verification-gap: clean.** Traced every one of Dashboard's cross-module reads, all schema migrations (additive only, no `ALTER`/`DROP`/`RENAME`), every touch to shared files (`lib/ngayVn.ts`, `globals.css`) across all 11 stories, and confirmed no test is skipped/disabled anywhere in the suite. No new gap found beyond what's already logged.

**Edge-case + adversarial — overlapping, mutually-confirming finding:**
- **`app/DashboardView.tsx:239`** (adversarial #3) / **same location** (edge-case) — `TheChiTieu` renders the *entire* `canhBaoNganSach` array with no cap, unlike the sibling `TheLichTrinh` card's explicit 5-item + "+N khác" truncation on the same hub. Found independently by both lenses. **Disposition: fix now** (cheap, matches an already-established sibling pattern in the same file — routed to Action items).

**Adversarial-only findings (10 total, cross-referenced against `deferred-work.md` first):**
1. `DashboardView.tsx:431` — `DongKyNang` prints "🔥0" for a 0-day streak (unlike `HocTapView.tsx`'s `TienDoCot`, which Story 9 deliberately gave a neutral zero-state to avoid this exact misleading badge). **Fix now** — cheap, matches an existing, already-correct sibling component in the same codebase.
2. `hoc-tap/model.ts:181` (`laChuaCoHoatDongHocTap`) / `DashboardView.tsx:392` — the "no activity yet" heuristic can be wrong for an actively-engaged user who has logged many sessions but hit a 2-day gap and never clicked "Hoàn thành Mốc" (streak=0 + never-completed + still-on-first-Mốc all being independently plausible for a *real* user, not just a fresh one). **Fix now** — this is the same heuristic Story 11's own review extracted into a pure function specifically to make it testable; the test coverage exists for the 4 cases the story's spec named, but this 5th real case wasn't in that I/O matrix. Worth tightening before calling CAP-12/Dashboard done — routed to Action items.
4. `DashboardView.tsx:150` — Lịch trình's 5-item cap takes the *first* 5 tasks by `thoiHan`, which can be 5 already-`daXong` tasks, hiding later pending ones entirely. **Fix now** — directly undermines the card's stated purpose (what's left to do today); cheap sort-by-pending-first fix.
8. `DashboardView.tsx:410` — the terminal "Đã hoàn thành Lộ trình" state drops streak visibility even when the user keeps logging sessions post-completion. **Defer** — real but secondary to findings #1/#2 on the same component; bundle into the same future fix pass.
3, 5, 6, 7, 9, 10 — unbounded budget-alert list (duplicate of the edge-case finding above, already routed), a long ghi-chú note with no CSS truncation in a dense dashboard row, missing `<h1>` on `/`, stale "Story 11 chưa build" comments plus no back-to-hub link from any module page, the `DashboardView.tsx:4` model.ts-vs-queries.ts import inconsistency (already captured under Architecture delta above), and the Dashboard's budget-alert summary having no persistent equivalent on the linked `/chi-tieu` page. **All deferred** — real, low-urgency polish, added to `deferred-work.md` as a consolidated Story 11 UX-polish batch.

## Behavior verification

Exercised end to end, same session, before this retrospective began: started `npm run dev`, requested all 6 routes (`/`, `/lich-trinh`, `/lich-trinh/mau-lich-trinh`, `/chi-tieu`, `/thuc-don/chon-mon`, `/hoc-tap`) directly over HTTP. All returned `200`, no error-boundary markers in any response body, and each page's expected content markers were present (`/`'s greeting/avatar/hub-grid; each module page's own title). Full unit suite independently re-run: `npm test` → 340/340 passing; `npm run build` → clean, no type errors. Not exercised: an actual browser click-through of any interactive flow (check-off, quick-add, Hoàn thành Mốc) — the verification above is HTTP-level rendering + the existing automated test suite, not a UI interaction trace.

## Previous-retro follow-through

None — this is the first retrospective for this spec (`{spec-folder}/RETROSPECTIVE.md` did not exist before this run). Nothing to follow through on.

## Action items

Items 1-4 were applied directly after this retrospective, same session (user request: "sửa 4 bug ở Dashboard"). Items 5-8 remain proposed only.

| # | Action | Source | Owner | Status |
|---|---|---|---|---|
| 1 | Cap `TheChiTieu`'s budget-warning list the same way `TheLichTrinh` caps its task list (e.g. 5 items + "+N khác") | Adversarial #3 + Edge-case #2, `DashboardView.tsx:239` | Nguyenanhphuong | **Done** — `SO_CANH_BAO_HIEN_TOI_DA` cap + "+N Danh mục khác đang cảnh báo" |
| 2 | Give `DongKyNang`'s 0-streak state the same neutral treatment `HocTapView.tsx`'s `TienDoCot` already uses, instead of printing "🔥0" | Adversarial #1, `DashboardView.tsx:431` | Nguyenanhphuong | **Done** — neutral "Chưa có streak" label when `streak === 0` |
| 3 | Replace `laChuaCoHoatDongHocTap()`'s streak/Mốc-only heuristic with an actual "has any Buổi học ever" signal (cheap `count()` or reuse of `layThangSomNhatHocTap()` scoped per Kỹ năng) | Adversarial #2, `app/hoc-tap/model.ts:181` | Nguyenanhphuong | **Done** — new `laDaTungCoBuoiHoc(kyNang)` query added to `app/hoc-tap/queries.ts`, heuristic function removed entirely (no longer needed), wired through `page.tsx` |
| 4 | Sort `TheLichTrinh`'s capped task list so pending tasks are never hidden behind already-`daXong` ones | Adversarial #4, `DashboardView.tsx:150` | Nguyenanhphuong | **Done** — stable sort by `daXong` before slicing |
| 5 | **Spec reconciliation:** build the deferred CAP-12 score-history view (`layLichSuDiemBaiTest()` + a list UI) as its own story — `BaiTestDanhGia` already supports it, no schema change needed | Spec-to-implementation reconciliation, deferred twice (Story 9 → 10) | Nguyenanhphuong | **Done** — Story 12 (`stories/12-xem-lich-su-diem-bai-test.md`, commit `0dc9466`). CAP-12 is now fully met. |
| 6 | Consolidate the cross-module duplicated constants (`SO_TIEN_TOI_DA`/`THOI_LUONG_TOI_DA`, `DO_DAI_GHI_CHU_TOI_DA`) and the 3 `formatTien`/`formatPhut` copies into `lib/` | Duplication map | Nguyenanhphuong | Proposed |
| 7 | One shared-`useTransition`-row-blocking fix across `TrinhSoanThaoMau`, `LichTrinhNgayView`, `ChiTieuView` (already flagged 3× in `deferred-work.md`, re-confirmed here) | Triage index group A | Nguyenanhphuong | Proposed |
| 8 | Investigate and fix `taoLichTrinhNgayTuMau()`'s misleading "revalidatePath during render" console error on the first render of a new day | `deferred-work.md`, Story 11 entry | Nguyenanhphuong | Proposed |

**Verification of items 1-4:** `npm test` → 339/339 passing (net -1 from the retro's baseline: -4 obsolete `laChuaCoHoatDongHocTap` tests, +3 new `laDaTungCoBuoiHoc` tests). `npm run build` → clean, no type errors. Live smoke test (`npm run dev` + HTTP fetch of `/`) → 200, no error boundary, confirmed the literal string `🔥0` no longer appears in the rendered HTML.

**Process lessons** (what would prevent the next one, not a fix for this instance):

- **The `(CAP-N)` suffix convention in every commit subject broke `git_evidence.py`'s story-attribution heuristic.** Not a project defect, but worth knowing for the next retro on this spec: the script's word-boundary id-matching collides with CAP numbers whenever a CAP number falls in the active story-id range. No process change needed — `baseline_commit` chaining already gives an independent, reliable cross-check — but future retros on this spec should expect the same collision and verify the same way rather than trusting the script's raw `stories` field.
- **Cross-module constant duplication recurred after being fixed once within a module.** Story 11's own review caught and fixed Chi tiêu's internal 30%-threshold duplication (moved to `model.ts`), but the *same class* of gap (Int32 guards, a note-length limit) already existed *across* modules and wasn't caught until this epic-wide retro, because no single story's review ever compares its new constants against sibling modules' `actions.ts` files. A "grep for this exact constant value elsewhere in the repo before declaring it" step in the build workflow's review pass would catch this class earlier.

## Acceptance verdict

**Verdict: accepted-with-open-items.**
**Criteria: profiled** — SPEC.md declares no single "the epic is accepted when X" statement; each of its 13 capabilities (CAP-1..CAP-13) carries its own `success:` line, and `stories.yaml` maps stories to them. This verdict is profiled from those, not read off a declared epic-acceptance criterion.

**Evidence:**
- All 11 stories in `stories.yaml` are `status: done` — no unfinished-story rejection trigger.
- 12 of SPEC.md's 13 capabilities have their declared `success:` criteria fully met by the current build, independently confirmed during this retro's spec-to-implementation reconciliation pass.
- **CAP-12's second success criterion is not met**: "lịch sử Điểm số Bài test đánh giá của Tiếng Anh xem lại được theo thời gian" has no implementation anywhere in the codebase (confirmed by grep). This is not an oversight — it was explicitly narrowed out twice, with reasoning and a concrete follow-up path recorded both times (`deferred-work.md`) — but it is real, tracked, unfinished work against the frozen spec, which is exactly what keeps a verdict from being a clean **accepted**.
- 4 real, fixable defects were found in this retro's code-review pass (Action items 1-4) that no story's own review caught, because each lives specifically at the Story 11 integration boundary between modules that no single earlier story's isolated review could see.
- Behavior verification (above) confirms the built system runs and serves all 5 routes correctly; nothing here rises to a blocking defect that would force **rejected** — every open item is either cosmetic, already-scoped future work, or a small, well-understood fix.

This is **accepted-with-open-items**, not **rejected**, because: every committed story is done, the runtime behavior verified cleanly, and every open item (the CAP-12 gap, the 4 Dashboard-boundary bugs, the duplication/pattern-divergence backlog) is a named, evidenced, actionable item — not an unresolved blocker standing in for undone work.

**Update (same day, after this retrospective):** action items 1-5 were applied — the 4 Dashboard boundary bugs fixed (commit `19b93c5`) and Story 12 built to close the CAP-12 gap (commit `0dc9466`). The verdict recorded above is kept as the historical record of the epic's state at the time this retrospective ran, not rewritten in place — see the Action items table for current status of every item.

## Open questions

- Should CAP-12's score-history view (Action item 5) become Story 12 now, or stay deferred indefinitely as a "nice to have"? The human's own prior decisions (twice narrowing it out under token-budget pressure) suggest it wasn't urgent at the time, but it's the only piece of the frozen SPEC.md left genuinely unbuilt.
- Is the shared-`useTransition` row-blocking pattern (flagged 3× since Story 1, Action item 7) worth a dedicated fix pass, or is it acceptable indefinitely given this is a single-user app where "one row's action blocks other rows' buttons for a moment" is a minor papercut, not a correctness bug?
- The god-component sizing trend (`ChiTieuView.tsx`, `NganHangMonAnView.tsx`) isn't a problem yet — is there an appetite for a file-splitting convention now, before a hypothetical Story 12+ adds a 4th story's worth of code to either file?


