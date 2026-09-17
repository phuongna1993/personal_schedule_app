---
title: 'Story 13: Nhập giờ bắt đầu/kết thúc cho Buổi học (Start/End Time Input)'
type: 'feature'
created: '2026-09-19'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'd569122a10bdf2a84bbb558063b2698956356871'
context:
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/stories/8-ghi-buoi-hoc.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-personal_phuongna/glossary.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Ghi buổi học (Story 8) requires typing a raw minute count for thời lượng — the user asked instead for a natural giờ bắt đầu/giờ kết thúc input, with phút computed automatically, for both Kỹ năng.

**Approach:** Replace `KyNangForm`'s single thời lượng number field with two native `<input type="time">` fields (giờ bắt đầu, giờ kết thúc). `ghiBuoiHoc()` (`app/hoc-tap/actions.ts`) now accepts `gioBatDau`/`gioKetThuc` instead of `thoiLuongPhut` and computes+validates the duration server-side (never trusting a client-computed value) — everything downstream of validation (the stored `BuoiHoc` row, `thoiLuongPhut`, `dinhDangBuoiHoc()`, every read in `queries.ts`, Story 9's streak/history, Story 11's dashboard) is completely unchanged, since only the *input* method changes, not what's stored.

## Boundaries & Constraints

**Always:**
- `ghiBuoiHoc()` computes `thoiLuongPhut = gioKetThuc - gioBatDau` (in minutes) server-side from two `"HH:mm"` strings — the client never sends a pre-computed duration, matching this app's "never trust client-computed values, validate at the Server Action boundary" convention used everywhere else.
- Both times are required and same-day only: `gioKetThuc` must be strictly after `gioBatDau` (no overnight-spanning sessions — reject equal or earlier end times with a clear error, don't attempt wraparound).
- The stored `BuoiHoc` row shape is unchanged — still just `thoiLuongPhut` (no new columns for start/end time; this story is an input-method change, not a schema change).
- Applies identically to both Kỹ năng — `KyNangForm` is the one shared component already used for both, so this change touches it once, not twice.
- `noiDung` validation (non-empty, ≤500 chars) is untouched.

**Ask First:** none — the exact visual layout of the two time fields (side-by-side vs. stacked) is ordinary UI implementation.

**Never:** no new DB columns for start/end time (compute-and-discard, only `thoiLuongPhut` persists); no overnight/cross-midnight session support (reject, don't wrap around); no change to `noiDung` validation, `ngay` stamping, or any read path (`layLichSuThang`, `tinhStreak`, `layThangSomNhatHocTap`, the Dashboard's Học tập card) — all consume `thoiLuongPhut` exactly as before.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid start/end same day | `gioBatDau: "20:00"`, `gioKetThuc: "20:30"` | Row created with `thoiLuongPhut: 30` | N/A |
| End equals start | `gioBatDau: "20:00"`, `gioKetThuc: "20:00"` | Rejected, no row created | `GIO_KET_THUC_KHONG_SAU_GIO_BAT_DAU` |
| End before start (would require overnight wrap) | `gioBatDau: "23:00"`, `gioKetThuc: "00:30"` | Rejected — no wraparound support | `GIO_KET_THUC_KHONG_SAU_GIO_BAT_DAU` |
| Missing/empty giờ bắt đầu | `gioBatDau: ""` | Rejected, no row created | `GIO_BAT_DAU_KHONG_HOP_LE` |
| Missing/empty giờ kết thúc | `gioKetThuc: ""` | Rejected, no row created | `GIO_KET_THUC_KHONG_HOP_LE` |
| Malformed time string (not `HH:mm`) | e.g. `gioBatDau: "8pm"` | Rejected before touching Prisma | `GIO_BAT_DAU_KHONG_HOP_LE` |
| Full-day span | `gioBatDau: "00:00"`, `gioKetThuc: "23:59"` | Accepted, `thoiLuongPhut: 1439` (max possible same-day value — no separate Int32 guard needed) | N/A |
| Automation Test uses the same input | any valid start/end on that Kỹ năng's form | Identical behavior, independent row, `kyNang: "AutomationTest"` | N/A |

</frozen-after-approval>

## Code Map

- `app/hoc-tap/actions.ts` (`kiemTraBuoiHoc()` at `:79`, `THOI_LUONG_TOI_DA` at `:34` to remove — max same-day diff is 1439, structurally under Int32, so this guard becomes dead code for this path) -- replace the `thoiLuongPhut` numeric check with: parse `gioBatDau`/`gioKetThuc` as `"HH:mm"` (regex `^([01]\d|2[0-3]):([0-5]\d)$`) into minutes-since-midnight, reject malformed strings, reject `ketThuc <= batDau`, then compute `thoiLuongPhut = ketThucPhut - batDauPhut` and proceed exactly as before (`DuLieuBuoiHoc`/`BuoiHocDaKiemTra` types updated to carry `gioBatDau`/`gioKetThuc` in, `thoiLuongPhut` out — same as today's out-shape)
- `app/hoc-tap/HocTapView.tsx` (`KyNangForm` at `:233`, `DuLieuForm`/`formTrong()` at `:223-231`, the existing `amount-field`/`unit-label` thời lượng block at `:294-311` to replace) -- swap `thoiLuongPhut: string` for `gioBatDau: string; gioKetThuc: string` in `DuLieuForm`; replace the single number input with two `<input type="time">` fields (native browser time picker, value format already `"HH:mm"` — no parsing needed client-side); `gui()`'s payload to `ghiBuoiHoc()` sends the two raw strings, no client-side subtraction (server is the sole source of truth per Boundaries)
- `app/hoc-tap/model.ts`, `app/hoc-tap/queries.ts`, `dinhDangBuoiHoc()`, `BuoiHocDaGhi` -- untouched; the stored/read shape of a `BuoiHoc` row does not change
- `app/hoc-tap/actions.test.ts` (existing `ghiBuoiHoc` describes, `:104-380`) -- rewrite every case to the new `gioBatDau`/`gioKetThuc` payload shape per the I/O matrix above; drop the now-inapplicable "decimal thời lượng"/"Int32 max" cases (structurally impossible with an `"HH:mm"` same-day diff), add the new malformed-time and end-not-after-start cases

## Tasks & Acceptance

**Execution:**
- [x] `app/hoc-tap/actions.ts` -- `kiemTraBuoiHoc()` accepts/validates `gioBatDau`/`gioKetThuc`, computes `thoiLuongPhut` server-side
- [x] `app/hoc-tap/HocTapView.tsx` -- two `<input type="time">` fields replacing the thời lượng number input, for both Kỹ năng (shared `KyNangForm`)
- [x] unit tests -- cover every I/O matrix row above, replacing the now-inapplicable old thời lượng cases

**Acceptance Criteria:**
- Given a valid giờ bắt đầu/kết thúc pair entered on either Kỹ năng's form, when saved, then the stored `BuoiHoc.thoiLuongPhut` exactly equals the minute difference, and every existing read (`/hoc-tap`'s tổng/lịch sử, Dashboard's Học tập card) displays it identically to before this story.
- Given `ghiBuoiHoc()` is called directly with a client-supplied `thoiLuongPhut` field (bypassing the UI), when validated, then it is ignored/rejected as an unrecognized payload shape — the server never derives duration from anything but its own `gioBatDau`/`gioKetThuc` computation.
- Given the Automation Test form, when a session is logged, then behavior is identical to Tiếng Anh's — same validation, same computed-duration logic, independent row.

## Verification

**Commands:**
- `npm test` -- all pass, including the rewritten `ghiBuoiHoc` cases
- `npm run build` -- succeeds, no type errors

**Manual checks:**
- On `/hoc-tap`: log a session for Tiếng Anh picking 20:00→20:45; confirm it saves and shows "45 phút" in the history/tổng. Try end time equal to or before start time; confirm a clear rejection message. Repeat for Automation Test; confirm it behaves identically and independently.

## Suggested Review Order

**Server — the sole source of truth for `thoiLuongPhut`**

- `parseGio()` — parses `"HH:mm"` into minutes-since-midnight, rejects malformed strings before touching Prisma.
  [`actions.ts:77`](../../../../app/hoc-tap/actions.ts#L77)

- `ghiBuoiHoc()` — computes `thoiLuongPhut` from `gioBatDau`/`gioKetThuc` server-side; a spoofed client `thoiLuongPhut` is structurally ignored (the payload shape no longer has a path for it to reach the stored value).
  [`actions.ts:173`](../../../../app/hoc-tap/actions.ts#L173)

- `GIO_KET_THUC_KHONG_SAU_GIO_BAT_DAU` — the same-day-only rule (no overnight wraparound), the story's one deliberate scope boundary.
  [`actions.ts:153`](../../../../app/hoc-tap/actions.ts#L153)

**UI — two time inputs, shared by both Kỹ năng**

- `KyNangForm` — the two `<input type="time">` fields replacing the old number input, identical for Tiếng Anh and Automation Test.
  [`HocTapView.tsx:274`](../../../../app/hoc-tap/HocTapView.tsx#L274)

- Review-caught fix: `xemTruocThoiLuong()` — display-only client preview (mirrors the server's validation rule independently, never sent as data) closing the "no feedback until submit" gap found in review.
  [`HocTapView.tsx:256`](../../../../app/hoc-tap/HocTapView.tsx#L256)

**Peripherals**

- Full I/O matrix coverage plus the malformed-`gioKetThuc`, spoofed-`thoiLuongPhut`, and lower-bound tests added in review.
  [`actions.test.ts`](../../../../app/hoc-tap/actions.test.ts)

