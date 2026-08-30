# Pokémon Control Center — checkpoint

Date: 2026-08-30

**Canonical progress: 20.51%**

Frontend branch: `feat/admin-control-center-foundation-v1` (PR #6 DRAFT).
Backend branch: `feat/admin-api-read-foundation-v1` (PR #89 DRAFT).

## Canonical score

- F0 = 5.00%.
- F1 = 11/12 = 7.33%.
- F2 = 9/16 = 6.75%.
- F3 = 2/14 = 1.43%.
- Total = **20.51%**.

F1.10, F2.3, F2.13, F3.1 and F3.5 are formally complete in Drive. F1.2 is the only remaining F1 item.

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
- test ownership refined in `2109166d428267503f2e369ceab69af85118b937` to require the token layer to be imported and consumed;
- semantic token layer added in `f23accc59ae6633e1a4cd9b7790dad4e04f30988`;
- activated in `ad1580a3c6bc531cf629115c0a7078af1a3b7a53`;
- formatter-only defect fixed with exact Biome output in final proven head `4589e659fe25387ea84778060ec5e124cef3309b`.

The token layer covers:

- typography scale and canonical font stack;
- spacing scale;
- canvas/panel/raised/overlay surfaces;
- success/warning/danger/info states;
- focus ring primitives;
- motion durations and easing;
- `prefers-reduced-motion` behavior;
- compatibility aliases for existing component CSS so the rollout does not require an artificial redesign.

Final deployment `dpl_4KGeXemAfic11YKkUde28ypZxCDi` completed READY on `4589e659fe25387ea84778060ec5e124cef3309b`.

Final Control Center proof:

- lock verified;
- Biome 28 files, no fixes;
- TypeScript strict;
- 9 test files / 19 tests green;
- Vite 8.2.2 build with 30 modules.

Full repository proof on the same deployment:

- 11 test files / 26 tests green;
- public Vite build with 125 modules;
- known public CSS warnings remained warnings and were not changed to obtain the admin gate.

The F3.1 synchronization head `701ce74ca90c4154c31320e61c906db748a499e4` also completed Vercel READY with the Control Center proof still green.

## F3.5 — capability-derived navigation

F3.5 is formally complete.

Problem found:

- `LiveOps` was marked `planned` and had no real backend capability contract, but `requiredAnyCapability: []` made it visible to every authenticated admin.

TDD/evidence:

- RED test commit `50e5acffcc18f007ca4b9bf86a94fd2d81e0f6e4` requires principals without privileges to see only `Hoje`, rejects invented capabilities, and requires planned LiveOps to remain hidden;
- Vercel rejected subsequent commits due account build-rate-limit before executing code; GitHub Actions also ended before any workflow step. Those infrastructure failures were not treated as technical RED/GREEN evidence;
- independent RED executed the exact prior GitHub blob SHA `dbfab0059609ab33312c0591ad3fad42eecacb5d`: without capabilities, `visibleSections()` returned `[today, liveops]`, violating the expected `[today]`;
- GREEN production head `e89ee02e2556c34631549cf33805f71c553f799b` changes `canSeeSection()` to fail closed for every `availability === 'planned'` section before capability evaluation;
- no fake LiveOps capability was introduced;
- independent GREEN compiled the exact final `navigation.ts` blob SHA `c3a53d09d592c87b2e63bfb166f103af6937e2e0` with TypeScript strict and executed all five navigation invariants successfully;
- verified outcomes: no capabilities → `[today]`; invented capability → `[today]`; planned LiveOps always denied; `player.read` + `audit.read` reveals `Hoje/Jogadores/Operações/Administração`; `content.validate` reveals `Hoje/Jogo`.

The last full-head Vercel proof before this isolated navigation delta was `701ce74ca90c4154c31320e61c906db748a499e4`, READY with Biome 28 files, TypeScript strict, 9 test files / 19 tests and 30-module Control Center build.

The UI progress indicator is synchronized to the Drive-canonical **20.51%**.

No production credentials, production hostname, merge, or privileged mutation lifecycle are authorized by this checkpoint.
