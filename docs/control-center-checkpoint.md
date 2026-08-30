# Pokémon Control Center — checkpoint

Date: 2026-08-30

**Canonical progress: 14.83%**

The canonical decision log and definitive checklist live in Google Drive under `RPG Pokémon — Engine Narrativa e Mecânica/05_ADMIN_CONTROL_CENTER`.

## Current implementation

Frontend branch: `feat/admin-control-center-foundation-v1`

Frontend draft PR: #6

Frontend runtime head proven before the shell-ownership refactor: `dce02f8aa85b38614880e08050658a21c7a5e76e`.

Current refactor candidate commit prepared from parent `a801681bbf0cbce892d18ae8e00104df7f4a788c`: `1a2f78ddda8e991f0031453a97e5d55a23c4eaf6`. This candidate is not counted as proven until the external verify gate executes it.

Backend branch: `feat/admin-api-read-foundation-v1`

Backend draft PR: #89

Backend proven head: `4aa82ade8da9557c9fe04ef6188e8af9cadf2768`

Both PRs remain DRAFT. No merge or production administrative release is authorized.

## Canonical score

- F0: 10/10 = 5.00%
- F1: 8/12 = 5.33%
- F2: 6/16 = 4.50%
- Total: **14.83%**

Promoted in the latest proven gate: F1.4, F1.9, F2.7, F2.8, F2.9, F2.12 and F2.14.

## Frontend proof already closed

Vercel deployment `dpl_CL1G6czWUhDQSRrW3Ntszp9MQrDH` proved the Control Center runtime with:

- Biome check green;
- TypeScript strict green;
- 5 test files / 13 tests green;
- Vite production build green.

## Shell ownership / diagnostics refactor candidate

A RED smoke assertion was added first requiring the session-gated UI to expose:

- `BUILD <label>`;
- explicit environment;
- explicit Admin API/session state.

Vercel then proved the RED for commit `41dd7577126469da0f39c7d7e0a69dbb07e44a44`: the new smoke test failed specifically because `BUILD local` was not yet rendered.

The candidate implementation now:

- exposes operational diagnostics before session unlock;
- keeps diagnostics visible after session validation;
- creates `components/shell/OperationalDiagnostics.tsx`;
- creates `components/shell/SessionGate.tsx`;
- creates `components/shell/ControlCenterSidebar.tsx`;
- creates shell-specific CSS ownership;
- reduces `App.tsx` to composition/navigation plus feature routing instead of owning session gate and sidebar internals;
- updates the visual canonical progress to 14.83%.

This candidate does **not** promote F1.5 or F1.8 until a clean external `check + typecheck + tests + build` executes the final branch head.

## Foundation still open

- F1.2 — dedicated admin deployment/hostname boundary;
- F1.5 — candidate implemented, proof pending;
- F1.8 — candidate implemented, proof pending;
- F1.10 — reproducible dependency/build boundary; no dedicated/root lockfile yet.

## Backend evidence

PR #89 remains read-only and has 15/15 canonical workflows green on `4aa82ade8da9557c9fe04ef6188e8af9cadf2768`, including the distributed PostgreSQL rate limiter, authorization adversarial package and mass-assignment matrix. No mutation HTTP endpoint exists.

## Security gates still open

- provider-level session expiration/logout/revocation;
- MFA/step-up where required;
- edge/pre-auth abuse protection plus non-bypassable origin;
- complete staging/production separation;
- correlation propagation into future mutation/audit flow.
