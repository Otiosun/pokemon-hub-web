# Pokémon Control Center — checkpoint

Date: 2026-08-30

**Canonical progress: 19.08%**

Frontend branch: `feat/admin-control-center-foundation-v1` (PR #6 DRAFT).
Backend branch: `feat/admin-api-read-foundation-v1` (PR #89 DRAFT).

## Canonical score

- F0 = 5.00%.
- F1 = 11/12 = 7.33%.
- F2 = 9/16 = 6.75%.
- Total = **19.08%**.

F1.10, F2.3 and F2.13 are formally complete in Drive. F1.2 is the only remaining F1 item.

## Frontend proven state

F1.10 final proven head: `f1f51c758ab7310c6d6df3e8d6ee59b2975d31bd`.

Vercel deployment `dpl_6u2eTrCQPyqbogh8WKTSSebn9qCj` completed READY on that exact head.

Reproducibility proof:

- Node 24.19.0;
- pnpm 11.23.0;
- canonical lock source `control-center/pnpm-lock.yaml.gz.b64`;
- reconstructed lock SHA-256 `dcacde6be17cf53c6c8acaa08f1715c0e25afc1f5fdc4c27300edd4862241e72`;
- frozen install with `--frozen-lockfile --ignore-scripts`;
- Control Center verify resolved from its own package-local dependency graph;
- 25 Biome files, TypeScript strict, 7 test files / 17 tests and Vite 29-module build green;
- full repository gate also completed green with 9 test files / 24 tests and public Vite build.

The UI progress indicator is synchronized to the Drive-canonical **19.08%**.

## F1.2 — dedicated deployment boundary WIP

Current implementation heads:

- RED: `9db609634775af13223ae795de8d7375bbae4306` — `deployment-boundary.test.ts` failed only because `control-center/vercel.json` did not exist;
- GREEN contract: `1c1d3f07ec8125af743787774908a768bf516d2e` — dedicated deployment configuration added and the invariant passed.

`control-center/vercel.json` makes the application independently deployable when a Vercel project uses Root Directory `control-center`:

- materialize and hash-verify the canonical lock from inside the admin root;
- run exact pnpm 11.23.0 frozen install;
- run package-local `pnpm verify` as build command;
- emit `dist` as the deployment output.

This fixes a real boundary gap: a dedicated project rooted at `control-center` cannot rely on the public Hub root `postinstall`.

The connected Vercel account currently has no project identifiable as the Pokémon Control Center. Existing `pokemon-hub-web` is still the preview executor. `pokemon-hub-webr` is an older unlinked project with a production deployment and is not being repurposed without evidence.

Therefore F1.2 **remains open**. Code/configuration readiness is not equivalent to a materially separate project/deployment/hostname.

Required external materialization for F1.2:

1. create a new Vercel project connected to `Otiosun/pokemon-hub-web`;
2. set Root Directory to `control-center`;
3. use staging-only `VITE_CONTROL_CENTER_ENV` and Admin API base URL for the first proof;
4. obtain an independent project ID + hostname;
5. run deployment/smoke proof and record it before promoting F1.2.

No production credentials, production hostname, merge, or privileged mutation lifecycle are authorized by this checkpoint.
