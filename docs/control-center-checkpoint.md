# Pokémon Control Center — checkpoint

Date: 2026-08-30

**Canonical progress: 22.65%**

Frontend branch: `feat/admin-control-center-foundation-v1` (PR #6 DRAFT).
Backend branch: `feat/admin-api-read-foundation-v1` (PR #89 DRAFT).

## Canonical score

- F0 = 5.00%.
- F1 = 11/12 = 7.33%.
- F2 = 9/16 = 6.75%.
- F3 = 5/14 = 3.57%.
- Total = **22.65%**.

F1.10, F2.3, F2.13, F3.1, F3.2, F3.3, F3.5 and F3.7 are formally complete in Drive. F1.2 is the only remaining F1 item.

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

TDD/evidence:

- RED `bb562455ea270cf0b9d2b69a489cdba380132084`; deployment `dpl_6kmdVK5L16s6xBBo1oDHYpmuTrLt` failed exactly because `src/app/design-tokens.css` did not exist;
- semantic token layer covers typography, spacing, surfaces, states, focus, motion and reduced motion;
- final proven head `4589e659fe25387ea84778060ec5e124cef3309b` completed Vercel READY;
- F3.1 sync head `701ce74ca90c4154c31320e61c906db748a499e4` also completed READY with Biome 28 files, TypeScript strict, 9 test files / 19 tests and Vite 30 modules.

## F3.5 — capability-derived navigation

F3.5 is formally complete.

- RED `50e5acffcc18f007ca4b9bf86a94fd2d81e0f6e4` proved planned LiveOps was being revealed without a real backend capability contract;
- independent RED on Git blob `dbfab0059609ab33312c0591ad3fad42eecacb5d` returned `[today, liveops]` without capabilities;
- GREEN head `e89ee02e2556c34631549cf33805f71c553f799b` fails closed for every `planned` section before capability evaluation;
- final navigation blob `c3a53d09d592c87b2e63bfb166f103af6937e2e0` compiled with TypeScript strict and passed all five navigation invariants;
- no fake LiveOps capability was introduced.

## F3.2 — responsive shell

F3.2 is formally complete after correcting a real root/CSS ownership bug.

- authenticated `App` was mounted on `control-center-shell`, while the responsive CSS tree was owned by `.control-center`;
- RED `36a7d95403f73708207557361f7a09840f451797` added `shell-layout-contract.test.ts` and reproduced the mismatch;
- GREEN `d521fc160c11664e0705aedf0df8be9b05eb0fc5` switches the authenticated root to `.control-center` without duplicating CSS;
- the responsive contract now reaches desktop grid, 80px rail at ≤1080px, fixed bottom navigation at ≤720px and the operational topbar.

## F3.3 — environment visibility

F3.3 is formally complete.

- before session validation, `SessionGate` renders `OperationalDiagnostics` from `config.environment`;
- after validation, the authenticated shell renders diagnostics from `session.environment` and sends the same environment to the sidebar;
- mobile CSS reflows diagnostics rather than hiding them;
- `environment-visibility-contract.test.ts` was versioned in `7e2d6cda3adc65ca7bbf7a7e428a06f153707938` and the contract passed independently.

## F3.7 — Today operational widget structure

F3.7 is formally complete.

- `TodayView` is the authenticated `today` surface;
- it includes a metric grid for canonical progress, principal and Player 360 state;
- it includes work queue and operational-state panels;
- `today-widgets-contract.test.ts` was versioned in `b7236d544cd9885dd4c8003cfe2c3ece88cd9321` and the structure contract passed independently;
- the checklist explicitly allows this foundation before every widget has a final live data source.

## Current verification limitation

The Vercel account is currently rejecting new branch builds with `build-rate-limit` before executing code. GitHub Actions for this PR also terminate before workflow steps. Those infrastructure failures are not counted as technical failures or successes. The last full-head executor proof remains `701ce74ca90c4154c31320e61c906db748a499e4` READY; later isolated deltas are being verified against exact GitHub blobs/contracts until the normal runner becomes available again.

The UI progress indicator is synchronized to the Drive-canonical **22.65%**.

No production credentials, production hostname, merge, or privileged mutation lifecycle are authorized by this checkpoint.
