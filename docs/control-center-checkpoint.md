# Pokémon Control Center — checkpoint

Date: 2026-08-30

**Canonical progress: 28.73%**

Frontend branch: `feat/admin-control-center-foundation-v1` (PR #6 DRAFT).
Backend branch: `feat/admin-api-read-foundation-v1` (PR #89 DRAFT).

## Canonical score

- F0 = 5.00%.
- F1 = 11/12 = 7.33%.
- F2 = 9/16 = 6.75%.
- F3 = 10/14 = 7.14%.
- F4 = 3/18 = 2.50%.
- Total = **28.73%**.

Formally complete in the current Control Center track: F1.10; F2.3, F2.13; F3.1, F3.2, F3.3, F3.5, F3.6, F3.7, F3.8, F3.9, F3.12, F3.13; F4.1, F4.2 and F4.3. F1.2 remains the only open F1 item.

## F1.2 — dedicated deployment boundary WIP

The application is independently buildable from Root Directory `control-center` through `control-center/vercel.json`, including verified lock materialization, pnpm 11.23.0 frozen install, package-local verify and `dist` output.

F1.2 remains open because the existing proof executes inside the public `pokemon-hub-web` Vercel project. A materially separate Control Center project ID + hostname + staging smoke proof are still required. The old unlinked `pokemon-hub-webr` project is not being repurposed without evidence.

## Last full executor proof

The latest full-head Vercel proof before the current account build-rate-limit is frontend head `701ce74ca90c4154c31320e61c906db748a499e4`, deployment `dpl_BeQinD5SbaRLyyREKASSAoYMeUw2`, READY.

Control Center on that proof:

- deterministic lock verified;
- Biome 28 files;
- TypeScript strict;
- 9 test files / 19 tests;
- Vite 30-module production build.

Subsequent deltas have been verified through exact source/blob contracts because Vercel currently rejects new branch builds before executing code and GitHub Actions for the PR terminate before workflow steps. These infrastructure failures are not treated as code pass/fail.

## F3.1 — administrative design tokens

Complete. Semantic layer covers typography, spacing, surfaces, states, focus, motion/easing and reduced-motion. Final dedicated proof head `4589e659fe25387ea84778060ec5e124cef3309b` was Vercel READY.

## F3.2 — responsive shell

Complete. A real ownership bug was fixed: authenticated App used `control-center-shell` while responsive CSS belonged to `.control-center`.

- RED `36a7d95403f73708207557361f7a09840f451797` reproduced the mismatch.
- GREEN `d521fc160c11664e0705aedf0df8be9b05eb0fc5` mounts the authenticated app on `.control-center`.
- The contract covers desktop grid, 80px rail at ≤1080px, fixed bottom navigation at ≤720px and operational topbar.

## F3.3 — environment permanently visible

Complete. Before session validation, diagnostics use `config.environment`; after validation, authenticated diagnostics and sidebar use `session.environment`. Mobile reflows rather than hides the environment diagnostic.

Evidence: `environment-visibility-contract.test.ts`, commit `7e2d6cda3adc65ca7bbf7a7e428a06f153707938`.

## F3.5 — capability-derived navigation

Complete.

- RED `50e5acffcc18f007ca4b9bf86a94fd2d81e0f6e4` exposed planned LiveOps leaking into navigation without a real capability contract.
- GREEN `e89ee02e2556c34631549cf33805f71c553f799b` fails closed for `availability === 'planned'` before capability evaluation.
- No fake LiveOps capability was added.

## F3.6 — progressive disclosure

Complete. Player 360 advanced filters start collapsed, use a native toggle with `aria-expanded`, and the advanced/sensitive surface only renders after explicit operator action while server capabilities remain authoritative.

Evidence: `progressive-disclosure-contract.test.ts`, commit `7b6909dd35b1fb46027f5b8ce357d9205897d8fd`.

## F3.7 — Today operational widget structure

Complete. `TodayView` contains metric grid, canonical progress, current principal, Player 360 state, work queue and operational-state panels. The checklist explicitly allows this structure before every widget has a final data source.

Evidence: `today-widgets-contract.test.ts`, commit `b7236d544cd9885dd4c8003cfe2c3ece88cd9321`.

## F3.8 — global search foundation

Complete strictly as a global-search foundation, not a complete command palette.

The topbar owns query state, labeled search input and wiring into the Today foundation, which routes player intent toward typed Player 360 search. The visible `⌘ K` is still only an affordance and is not claimed as an implemented hotkey.

Evidence: `global-search-foundation-contract.test.ts`, commit `a22a4c557f857637d2bb87b7aa5453b43a173be1`.

## F3.9 — operational loading/empty/error/ready states

Complete for the current shell/Player 360 surfaces.

Search and selection distinguish idle/loading/ready/error; loading has explicit feedback, errors remain inline with alert semantics and correlation ID when available, ready materializes results/ficha, and empty surfaces are explicit without fake player data. SessionGate separately distinguishes validating vs blocked access.

Evidence: `state-surfaces-contract.test.ts`, commit `3d8e3898f4ba73b2fae03893ea93163c943cf055`.

## F3.12 — keyboard navigation and accessible focus

Complete in the F3 shell scope.

Audit found `.player-result:focus-visible` suppressing the semantic focus ring with `outline: none`.

- RED `6e1a206b80da4eb41e675425d68fbb7f0ca27d50` requires native keyboard controls and visible semantic focus.
- GREEN `23baa7ed66456664a10b9b5b30cb2931e19d860b` restores `--focus-ring-width`, `--focus-ring-color` and `--focus-ring-offset` on Player 360 result focus.

This does not replace the final WCAG audit in F9.8.

## F3.13 — viewport-native mobile navigation

Complete. At ≤720px the desktop shell is replaced by a fixed bottom navigation surface with mobile-specific grid/layout behavior rather than a squeezed desktop sidebar.

Evidence: `mobile-navigation-contract.test.ts`, commit `de41d218a31db7fd263971c6a648cea88b0f05e9`.

## Still open in F3

- F3.4 current principal visible **with access to session/profile** — identity is visible but there is not yet a proper session/profile surface.
- F3.10 toast policy — no toast system/policy implementation yet.
- F3.11 modal/drawer policy — no canonical implementation yet.
- F3.14 performance budget + lazy loading — not implemented/proven yet.

## F4.1 — player search and stable pagination

Complete.

The UI sends only contract-derived filters: `status`, `trainerNamePrefix`, `originRegionId`, and the sensitive pair `identityProvider + externalId`; `limit` is fixed at 25. Pagination consumes the server-provided `nextCursor` and appends the next page.

The backend `Player360SearchRequestSchema` is strict, validates the external identity pair and sensitive flag, and models cursor state as `{createdAt, playerId}`. `Player360Service` decodes/validates that cursor and emits the next cursor from the last item when more rows exist.

## F4.2 — safe player identification

Complete.

Each result exposes enough operational context to avoid acting on the wrong player: trainer name, canonical player UUID, level, status, area and active encounter/battle status. External identity is shown as protected when redacted.

Sensitive redaction is enforced server-side by `Player360Service`: ordinary reads null `identities[].externalId` and `profile.metadata`, while sensitive reads/searches require dedicated backend authorization.

## F4.3 — Player 360 Overview

Complete.

Selecting a search result uses the UUID returned by the server and performs a fresh Player 360 read. The Overview materializes real identity/status/revision plus progression, location, onboarding and Pokédex counts, with explicit loading/error/empty states and no fake player record.

These F4.1–F4.3 surfaces already existed unchanged in the full-head Vercel READY proof `701ce74ca90c4154c31320e61c906db748a499e4`. The only later Player 360 delta was the F3.12 focus-ring CSS correction.

Backend evidence corresponds to head `80fc5884fe5d06d2335c653b2c01ea4c05f15f1e`, whose Admin API/Player 360 slice had 17/17 workflows green.

## Still open in F4

F4.4–F4.18 remain open. The eight deeper Player 360 areas shown below the Overview are still anatomy/preview or require domain data, mutations, wizard, conflict handling, audit and E2E support. They are not promoted by association with the Overview.

## Current frontend implementation head

Implementation head immediately before this documentation sync: `ef0e84a747d21775f7e57c4d0b4ae700fd4e550c`.

The UI progress indicator is synchronized to the Drive-canonical **28.73%**.

No production credentials, production hostname, merge, or privileged mutation lifecycle are authorized by this checkpoint.
