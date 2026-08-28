---
review: version-verification
target: ../ARCHITECTURE-SPINE.md
date: 2026-08-29
method: independent web search (not trusting spine claims or training data)
---

# Version Verification Review — ARCHITECTURE-SPINE.md Stack Table

## Verdict: SOME WRONG

Two of the six pinned versions (SQLite, TypeScript) are demonstrably stale as of August 2026 — not merely "unverified" but contradicted by current release data. Three are confirmed accurate and current (Next.js, Node.js, React). Prisma is accurate but the stated rationale for avoiding Prisma 8 is now out of date (Prisma 8 has since gone GA, it isn't just "too recent" anymore).

The `.memlog.md` itself is honest about the gap: it explicitly flags "Node/React verified via web search, TS version is best-current-knowledge estimate not independently verified" — and that hedge turns out to be correct: TS is wrong. SQLite's version was stated in the spine with no verification caveat at all in the memlog, and it is also wrong.

## Item-by-item findings

### 1. Next.js 16.3.x — CONFIRMED, current

- Web-verified: Next.js 16.3 is real; stable release announced 2026-08-03 (https://nextjs.org/blog/next-16-3, corroborated by The Register coverage dated 2026-08-04).
- As of today (2026-08-29) this is the current stable minor — not superseded.
- Memlog claims this was "verified via web search" during the run — consistent with what I independently found. No issue.

### 2. React 19.2.x — CONFIRMED, and the pairing with Next.js 16.3 is real

- Web-verified: React 19.2 is real (View Transitions, `useEffectEvent`, `Activity`, partial pre-rendering in `react-dom`).
- Confirmed the pairing claim ("đi kèm Next.js 16.3"): Next.js 16's App Router is documented as using the React version that ships 19.2's features, and third-party write-ups explicitly title themselves "Next.js 16 + React 19.2 in Production." This is a real, current pairing, not an invented one.

### 3. Node.js 24.x LTS ("Krypton") — CONFIRMED, current and correctly named

- Web-verified: codename "Krypton" is correct for the Node 24 line (GitHub release tags for v24.11.0, v24.13.0, v24.16.0, v24.19.0, v24.20.0 all confirm "Krypton").
- Node 24 entered Active LTS 2025-10-28 and remains Active LTS through 2026-10-20 (Maintenance starts then), EOL 2028-04-30 — so as of 2026-08-29, Node 24.x is correctly the current Active LTS. Node 26 is "Current" (not yet LTS until October 2026), so pinning 24.x LTS today is the right call, not a stale one.
- No issue with this claim.

### 4. Prisma ORM 7.10.x — version is real and the SQLite/better-sqlite3 support claim is accurate, but the stated rationale for avoiding Prisma 8 needs updating

- Web-verified: Prisma ORM 7.10.0 is real (adds a `@prisma/prisma7` compatibility package, Prisma Studio localhost hardening, adapter fixes including `@prisma/adapter-better-sqlite3` error-code handling improvements). This is a genuine, current 7.x release.
- The better-sqlite3 driver adapter claim is accurate: `@prisma/adapter-better-sqlite3` is a real, actively published package (npm shows a recent release, ~7.9.1 at last index — i.e., the adapter line is one patch behind the 7.10.0 core release, which is a normal/expected lag, not a real mismatch).
- Problem with the *reasoning*, not the version itself: the memlog justifies pinning 7.x by saying Prisma 8 was "released 2026-08-02 - too recent for reliable AI-agent training-data coverage." As of today (2026-08-29), that framing is stale: Prisma 8 has already progressed past GA — dev builds of **8.1.0-dev.1** already exist, meaning 8.0 shipped as stable weeks ago, not "just released." The decision to stay on 7.10.x is still defensible (stability, avoiding a brand-new major for an AI-agent build), but the architecture doc should describe it as "deliberately staying one major version behind a now-GA Prisma 8," not as "avoiding a bleeding-edge just-released version." Recommend updating the rationale language so a future reader isn't misled about how mature Prisma 8 currently is.

### 5. SQLite 3.46.x (via better-sqlite3 driver adapter) — WRONG / STALE

- Web-verified: SQLite 3.46.0 (2024-05-23) and 3.46.1 (2024-08-13) are real releases, but they are **over two years old** as of August 2026. SQLite has since shipped multiple major point releases — 3.52.0 (2026-03-06) and 3.53.x, with 3.53.4 as the latest patch (released 2026-07-24). The claimed 3.46.x is roughly seven minor versions behind current SQLite.
- More importantly, the way the claim is framed is technically confused: `better-sqlite3` **statically bundles its own compiled copy of the SQLite C library** — it does not use whatever "SQLite 3.46.x" happens to be installed on the system, and the architecture doc's own parenthetical ("nhúng qua driver adapter better-sqlite3") gestures at this but then still asserts a specific SQLite patch version as if it were independently pinned. I checked what version current `better-sqlite3` actually bundles: the package's current `master` branch bundles **SQLite 3.53.2** — nowhere near 3.46.x. Whatever `better-sqlite3` version actually gets installed when this project is built will determine the real embedded SQLite version, and today that resolves to ~3.53.x, not 3.46.x.
- This entry should be corrected. Recommended fix: either (a) drop the specific SQLite patch pin entirely and just say "SQLite version bundled by whatever `better-sqlite3` resolves to at install time (currently ~3.53.x)," or (b) if a specific SQLite version genuinely matters to the architecture, pin the `better-sqlite3` npm package version explicitly rather than an SQLite version, since that's the actual lever available to the build.
- Not flagged as verified anywhere in the memlog — this looks like it was asserted from training data without a web check, and the check now shows it's wrong.

### 6. TypeScript 5.9.x — WRONG / STALE

- Web-verified: TypeScript 5.9 is real, but it shipped around August 2025 — a full year before this architecture doc's date. Since then:
  - **TypeScript 6.0** (last JS-based version) shipped 2026-04-16, bridging 5.9 to 7.0.
  - **TypeScript 7.0** — the native Go-ported compiler, 8–12x faster builds — has since shipped as stable (InfoQ coverage dated August 2026; npm shows current stable **7.0.2**, "last published 2 months ago" as of the 2026-08-28 search snapshot, with a 7.1.0-dev build already in progress).
- So as of today, current stable TypeScript is **7.0.x**, not 5.9.x — two major versions ahead of what the spine pins. This is a real, sizeable miss, not a rounding error.
- Notably, this isn't a fringe detail disconnected from the rest of the stack: Next.js 16.3's own release notes (independently pulled during this same verification) state "`next build` can use TypeScript 7 for type checking" — meaning the exact Next.js version this architecture pins already assumes/targets TypeScript 7 in its own tooling. Pinning TypeScript 5.9.x alongside Next.js 16.3 is thus not just outdated in isolation, it's slightly out of step with the rest of the chosen stack.
- The memlog is candid about this: it explicitly recorded "TS version is best-current-knowledge estimate not independently verified" — i.e., this entry was asserted from training data, not checked, and the flag was correct to raise. The check now confirms the estimate was wrong.

## Cross-cutting fit check

- Next.js 16.3 + React 19.2: fits, confirmed by multiple independent sources describing this as the actual current pairing.
- Next.js 16.3 + Node 24.x LTS: no incompatibility found; Node 24 is the current Active LTS baseline broadly recommended for 2026-era Next.js apps.
- Prisma 7.10 + SQLite via better-sqlite3: fits and is a real, current, documented combination — Prisma's own docs and changelog describe exactly this adapter path.
- Prisma 7.10 + Node 24.x: one open concern surfaced during search — a GitHub issue titled "Cannot install `@prisma/adapter-better-sqlite3` on Node.js v24" (prisma/prisma#28624) turned up in results. I did not open/triage this issue in depth (it surfaced as a search hit, not something I verified as resolved or still open), but given the spine pins both Node 24.x and the better-sqlite3 adapter together, this is worth a manual check before build — if unresolved, it would directly undercut the "fits together" claim for this pairing.
- TypeScript 5.9 sits awkwardly next to Next.js 16.3, which (per its own release notes) already assumes TypeScript 7 tooling — see finding 6 above.

## Recommended corrections to the Stack table

| Name | Spine's claim | Recommended correction |
| --- | --- | --- |
| SQLite | 3.46.x | Remove the independent SQLite version pin, or note it tracks whatever `better-sqlite3` bundles (currently ~3.53.x) |
| TypeScript | 5.9.x | Update to 7.0.x (current stable as of Aug 2026), or explicitly document a deliberate reason to stay on 5.9/6.0 if the native Go compiler transition is a concern for the AI-agent build |
| Prisma ORM | 7.10.x (rationale: avoiding a "too recent" 8.0) | Keep version, but correct the rationale — Prisma 8 is already GA (8.1.0-dev builds exist), so this is a deliberate stay-behind decision, not an avoid-bleeding-edge one |
| Node.js, Next.js, React | No change needed | Confirmed accurate and current |

## Open item not resolved by this review

- `prisma/prisma#28624` ("Cannot install `@prisma/adapter-better-sqlite3` on Node.js v24") surfaced in search results and was not triaged for resolution status. Recommend a direct check of this issue before committing to the Node 24 + better-sqlite3 adapter pairing at build time.
