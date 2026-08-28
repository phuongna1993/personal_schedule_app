# PRD Quality Review — App Quản Lý Cá Nhân Đa Năng (prd-personal_phuongna-2026-08-19)

## Overall verdict

For a solo, no-auth, dogfooding personal tool, this PRD is unusually rigorous where it matters: FR consequences are mostly testable and several (FR-6's 30%/100% budget thresholds, FR-13's fully enumerated 7-milestone roadmap) are exemplary quantified specs rather than adjectives. Non-Goals, MVP Out-of-Scope, and the Assumptions Index are honest and appropriately light for the stakes. What's at risk is at the edges, not the core: the PRD's own stated value thesis ("đủ nhanh để dùng mỗi ngày") is never turned into a testable bound anywhere in the FRs, the decision to build all 4 modules simultaneously with no phasing is stated but never defended against the obvious solo-builder risk, and the Assumptions Index has a roundtrip gap (2 of 3 entries have no inline `[ASSUMPTION]` tag at their source). None of these block the PRD from being usable for the next step, but they're the first things a careful reader — including the author's future self — would trip on.

## Decision-readiness — adequate

Most concrete decisions are stated plainly and their consequences spelled out rather than smoothed over: FR-6 commits to a fixed, non-configurable 30%/100% threshold and says so explicitly ("Ngưỡng 30% là cố định, không tuỳ chỉnh theo từng Danh mục"); FR-9 states flatly that Thực đơn does not feed Chi tiêu. §8 Open Questions is empty, which is plausible for a one-person PM/builder — but two things undercut that claim of closure.

### Findings
- **medium** Asymmetric milestone rule between the two roadmaps is unexplained (§4.4 FR-13) — English requires a self-authored Assessment Test before a Milestone can be marked complete; Automation Test does not ("Đánh dấu Hoàn thành một Mốc ở Lộ trình này là quyết định thủ công, không cần Bài test đánh giá"). The Description for §4.4 claims both skills share "cùng một cách tương tác" (the same interaction pattern), yet the actual completion gate differs. No rationale is given for why one roadmap needs an evidence artifact and the other doesn't — a real design choice presented as if self-evident. *Fix:* add one sentence stating why (e.g., English proficiency is harder to self-assess honestly than a portfolio milestone), or make the rule symmetric.
- **low** Two "xác nhận/confirm" markers sit outside the tracked Open Questions / Assumptions system while §8 asserts none remain: the title itself is flagged `*Working title — confirm.*` (line 9), and §4.2 Notes reads "Đơn vị tiền tệ là VNĐ (xác nhận)" (currency pending confirmation). Both are unresolved decisions that should either be closed or logged as Open Questions. *Fix:* resolve both and delete the markers, or move them into §8.

## Substance over theater — strong

No furniture found. There is exactly one implicit persona (the author, dogfooding — appropriately not multiplied into personas that don't drive decisions). No differentiation/innovation section was force-fit in. The Vision (§1) is specific to this user's actual life — four named problem areas, a 4-year-old and a sub-1-year-old, two named learning tracks (English A1→B1, a 7-milestone automation-test path) — and could not be swapped into another PRD unchanged. No NFR boilerplate ("must be scalable/secure") appears anywhere.

## Strategic coherence — adequate

The thesis is clear and consistently followed: replace disjoint paper/memory/Excel tracking with "một nơi duy nhất, đủ nhanh để dùng mỗi ngày" so that logging becomes habitual. Success Metrics track that thesis directly — SM-1 is a 4-week streak of actual daily use, SM-2 is a trend (fewer over-budget categories over time), SM-3 is milestone cadence — none are activity-count vanity metrics, and SM-C1 explicitly counter-balances SM-1 against dishonest/hollow logging ("tick task giả, ghi qua loa cho có... không phải là thành công"). That counter-metric is a genuine strength few PRDs at any scale bother to include.

### Findings
- **medium** Build-all-4-modules-at-once is stated as a decision with no trade-off analysis (§6.1: "Cả 4 Feature (§4.1–4.4) hoạt động đầy đủ cho v1, build đồng thời — không chia giai đoạn"). For a solo builder, taking on four substantive domains simultaneously as v1 (rather than phasing by which habit is most fragile today) is a real scope/schedule risk that the thesis itself would argue against — the Vision's own argument is that partial/rushed tracking is why paper and Excel failed. The PRD doesn't say why simultaneous build is safe here. *Fix:* add a line naming the risk and why it's accepted (e.g., all 4 are small enough individually, or the user already has slack time), or reconsider phasing.

## Done-ness clarity — adequate

This is the PRD's strongest dimension in places and its weakest in one specific spot. FR-6 and FR-13 are model examples — fixed numeric thresholds, an explicit enumerated 7-step list, and explicit statements of what does *not* trigger completion ("hệ thống không tự động tính hoàn thành dựa trên số giờ học tích luỹ"). Most other FRs (FR-1–FR-5, FR-7–FR-11) have at least one concrete, verifiable consequence.

### Findings
- **medium** The PRD's own core value claim is never made testable. Vision (§1) stages the entire value proposition on speed — "đủ nhanh để dùng mỗi ngày," "ưu tiên tốc độ nhập liệu" — and UJ-1 quantifies the aspiration loosely ("Bốn thao tác, một phiên, dưới vài phút"). But no FR or NFR anywhere converts this into a bound an engineer could check against (e.g., "ghi một Giao dịch mất tối đa N thao tác/giây"). Every other FR in the document earns a testable consequence; the one claim the whole product is staked on doesn't. *Fix:* add a lightweight NFR or fold a speed bound into UJ-1/FR-4 (e.g., a target click/step count for the four daily actions).
- **low** FR-12's second consequence is disjunctive and under-specified: "có thể xem chuỗi ngày học liên tục (streak) hoặc biểu đồ theo thời gian" — "hoặc" leaves it open whether one, either, or both must ship, which weakens what "done" means for this FR. *Fix:* pick one (or state both are acceptable and either satisfies the FR).

## Scope honesty — strong

§5 Non-Goals and §6.2 Out-of-Scope are substantive, not template filler — they name specific real omissions (no multi-user/auth, no mobile, no external recipe integration, no active notifications, no Thực đơn↔Chi tiêu link, no monetization) and, notably, the export/backup deferral in §6.2 is phrased as a genuinely reconsiderable trade-off ("hiện chưa cần, có thể xem xét lại nếu nhu cầu phát sinh sau này") rather than a silent drop. Three `[ASSUMPTION]`-worthy inferences are logged in §9 Assumptions Index at a density appropriate for a low-stakes, single-decision-maker PRD.

### Findings
- **medium** The backup/export deferral doesn't name the risk it's accepting. §6.1 commits to durable local persistence ("không mất khi đóng/mở lại app"), while §6.2 defers export/backup as not-yet-needed. For a single-machine personal tool holding financial records, schedules, and multi-year learning history with no auth and (implicitly) no cloud sync, this is a real single-point-of-failure risk (disk failure, accidental deletion) that current phrasing treats as a nice-to-have feature gap rather than a data-loss risk being knowingly accepted. *Fix:* reframe the §6.2 bullet to name the risk explicitly, even if the answer stays "defer" — e.g., `[NON-GOAL for MVP]` with one line acknowledging the single-point-of-failure trade-off.

## Downstream usability — strong

§0 states this PRD feeds UX, architecture, and epics/stories, so this dimension is load-bearing rather than optional here. The Glossary (§3) is comprehensive and terms are used consistently and capitalized identically across all four Feature sections and the Success Metrics — no synonym drift was found (Task, Giao dịch, Danh mục chi tiêu, Ngân sách, Mốc, Lộ trình, etc. all match their §3 definitions verbatim). FR IDs (FR-1–FR-13) are contiguous with no gaps or duplicates; SM cross-references (SM-1 validates FR-2/FR-3, SM-2 validates FR-5/FR-6, SM-3 validates FR-13) all resolve to real FRs; every Feature's "Realizes UJ-1" resolves to the sole UJ.

### Findings
- **low** UJ-1's protagonist is generic ("người dùng mở app...") rather than a named individual carrying context inline, per the mechanical checklist's protagonist-naming convention. Given the audience is unambiguous (the one real dogfooding user), impact is limited, but a named light persona would make UJ-1 more reusable if this PRD is ever read outside its original context. *Fix:* optional — give the user a placeholder name in UJ-1 for consistency with downstream UX conventions.

## Shape fit — strong

The PRD correctly takes the capability-spec shape the rubric prescribes for a hobby/single-operator tool: one UJ (not persona-inflated), Success Metrics that are personal/behavioral rather than business KPIs, and a Non-Goals section doing the work that stakeholder sign-off would do in a multi-user PRD. It is not over-formalized (no invented stakeholders, no compliance section, no auth/permission model padded in) and not under-formalized (FRs still carry real testable consequences suitable for feeding UX/architecture/stories per §0's stated purpose). This is a well-calibrated fit for the stated stakes.

## Mechanical notes

- **Assumptions Index roundtrip is broken for 2 of 3 entries.** §9 lists three items (FR-1, FR-8, FR-13), but only the FR-8 entry has a corresponding inline `[ASSUMPTION]` tag at its source (§4.3 Notes: `` `[ASSUMPTION]` Món ăn không quản lý công thức... ``). The FR-1 consequence ("Thời hạn của Task chỉ là một khung giờ trong ngày... hệ thống không cho phép Task kéo dài qua ngày hôm sau," §4.1) and the FR-13 consequence about self-authored assessment tests (§4.4) carry the same content as their index entries but have no inline `[ASSUMPTION]` marker at the source — a reader scanning §4.1/§4.4 for flagged assumptions would miss both. *Fix:* add inline `[ASSUMPTION]` tags at both source locations, or drop them from the index if they're considered settled decisions rather than assumptions.
- **ID continuity:** clean. FR-1–FR-13 contiguous, no gaps/duplicates. SM-1, SM-2, SM-3, SM-C1 contiguous. Single UJ-1, referenced consistently.
- **Glossary drift:** none detected. Capitalized domain terms are used identically across Vision, Glossary, Features, and Success Metrics.
- **Untracked confirmation markers:** the title's "Working title — confirm" (line 9) and §4.2's "(xác nhận)" on currency are decisions pending confirmation that live outside the Open Questions / Assumptions tracking system, while §8 states no open questions remain — a minor inconsistency in an otherwise clean tracking discipline (see Decision-readiness finding above).
- **Required sections for stakes/type:** appropriate. No stakeholders/approvals section, no compliance section, no monetization section — all correctly absent for a solo hobby tool, not gaps.
