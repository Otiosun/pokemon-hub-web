# Pokémon Control Center — checkpoint

Date: 2026-08-30

**Canonical progress: 24.08%**

Frontend branch: `feat/admin-control-center-foundation-v1` (PR #6 DRAFT).
Backend branch: `feat/admin-api-read-foundation-v1` (PR #89 DRAFT).

## Canonical score

- F0 = 5.00%.
- F1 = 11/12 = 7.33%.
- F2 = 9/16 = 6.75%.
- F3 = 7/14 = 5.00%.
- Total = **24.08%**.

F1.10, F2.3, F2.13, F3.1, F3.2, F3.3, F3.5, F3.7, F3.8 and F3.13 are formally complete in Drive. F1.2 is the only remaining F1 item.

## Frontend proven state

F1.10 final proven head: `f1f51c758ab7310c6d6df3e8d6ee59b2975d31bd`.

Vercel deployment `dpl_6u2eTrCQPyqbogh8WKTSSebn9qCj` completed READY on that exact head.

Reproducibility proof:

- Node 24.19.0;
- pnpm 11.23.0;
- canonical lock source `control-center/pnpm-lock.yaml.gz.b64`;
- reconstructed lock SHA-256 `dcacde6be17cf53c6c8acaa08f1715c0e25afc1f5fdc4c27300edd4862241e72`;
- frozen install with `--frozen-lockfile --ignore-scripts`;
- Control Center verify resolved from its own package-local dependency graph.

## F1.2 — dedicated deployment boundary WIP

- RED: `9db609634775af13223ae795de8d7375bbae4306` — `deployment-boundary.test.ts` failed only because `control-center/vercel.json` did not exist;
- GREEN contract: `1c1d3f07ec8125af743787774908a768bf516d2e` — dedicated deployment configuration added;
- proven WIP head: `07811f3b7d457b1ad64db0e2b39ee476a47ddb3a`;
- Vercel proof `dpl_4eUz8V8g6jpaVNidSmdv6EjD4V4C` READY with 8 test files / 18 tests and 29-module Control Center build.

`control-center/vercel.json` makes the app independently buildable from Root Directory `control-center`, including verified lock materialization, pnpm 11.23.0 frozen install, package-local verify and `dist` output.

F1.2 **remains open** because the proof still executes inside the public `pokemon-hub-web` Vercel project. The account has no project identifiable as the dedicated Pokémon Control Center, and the old unlinked `pokemon-hub-webr` project is not being repurposed without evidence. A new project ID + hostname + smoke proof are still required.

## F3.1 — administrative design tokens

F3.1 is formally complete.

- RED `bb562455ea270cf0b9d2b69a489cdba380132084` proved the semantic token layer was absent;
- final proven head `4589e659fe25387ea84778060ec5e124cef3309b` completed Vercel READY;
- F3.1 sync head `701ce74ca90c4154c31320e61c906db748a499e4` also completed READY with Biome 28 files, TypeScript strict, 9 test files / 19 tests and Vite 30 modules.

## F3.5 — capability-derived navigation

F3.5 is formally complete.

- RED `50e5acffcc18f007ca4b9bf86a94fd2d81e0f6e4` proved planned LiveOps was visible without a real capability contract;
- GREEN `e89ee02e2556c34631549cf33805f71c553f799b` fails closed for `availability === 'planned'` before capability evaluation;
- final navigation blob `c3a53d09d592c87b2e63bfb166f103af6937e2e0` compiled under TypeScript strict and passed all five capability-navigation invariants.

## F3.2 — responsive shell

F3.2 is formally complete after correcting a real root/CSS ownership bug.

- authenticated App used `control-center-shell`, while responsive CSS was owned by `.control-center`;
- RED `36a7d95403f73708207557361f7a09840f451797` reproduced the mismatch;
- GREEN `d521fc160c11664e0705aedf0df8be9b05eb0fc5` mounts the authenticated app on `.control-center` without duplicating CSS;
- responsive contract reaches desktop grid, 80px rail at ≤1080px, fixed bottom navigation at ≤720px and operational topbar.

## F3.3 — environment visibility

F3.3 is formally complete.

- before session validation, `SessionGate` renders `OperationalDiagnostics` from `config.environment`;
- after validation, authenticated shell renders diagnostics from `session.environment` and sends the same environment to sidebar;
- mobile CSS reflows diagnostics rather than hiding them;
- proof is versioned in `environment-visibility-contract.test.ts`, commit `7e2d6cda3adc65ca7bbf7a7e428a06f153707938`.

## F3.7 — Today operational widget structure

F3.7 is formally complete.

- `TodayView` includes metric grid, canonical progress, current principal, Player 360 state, work queue and operational-state panels;
- proof is versioned in `today-widgets-contract.test.ts`, commit `b7236d544cd9885dd4c8003cfe2c3ece88cd9321`.

## F3.13 — viewport-native mobile navigation

F3.13 is formally complete.

- at ≤720px, `.control-center` abandons desktop grid and reserves lower viewport space;
- `.sidebar` becomes a fixed bottom/left/right navigation bar with width 100%;
- `.primary-nav` owns a mobile grid and desktop descriptions are removed;
- proof is versioned in `mobile-navigation-contract.test.ts`, commit `de41d218a31db7fd263971c6a648cea88b0f05e9`.

## F3.8 — global search foundation

F3.8 is formally complete strictly as the global-search foundation, not as a complete command palette.

- topbar owns `query` state and a labeled global search input;
- query input is wired through `setQuery`, propagated to Today and produces the `BUSCA GLOBAL · FOUNDATION` surface;
- the foundation routes the operator toward the typed Player 360 search;
- the visible `⌘ K` hint is not yet counted as an implemented hotkey;
- proof is versioned in `global-search-foundation-contract.test.ts`, commit `a22a4c557f857637d2bb87b7aa5453b43a173be1`.

## Current verification limitation

The Vercel account is currently rejecting new branch builds with `build-rate-limit` before executing code. GitHub Actions for this PR also terminate before workflow steps. Those infrastructure failures are not counted as technical failures or successes. The last full-head executor proof remains `701ce74ca90c4154c31320e61c906db748a499e4` READY; later isolated deltas are being verified against exact GitHub blobs/contracts until the normal runner becomes available again.

The UI progress indicator is synchronized to the Drive-canonical **24.08%**.

No production credentials, production hostname, merge, or privileged mutation lifecycle are authorized by this checkpoint.
