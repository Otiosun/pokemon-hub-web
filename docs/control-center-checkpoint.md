# Pokémon Control Center — checkpoint

Date: 2026-08-30

**Canonical progress: 14.83%**

The canonical decision log and definitive checklist live in Google Drive under `RPG Pokémon — Engine Narrativa e Mecânica/05_ADMIN_CONTROL_CENTER`.

## Current implementation

Frontend branch: `feat/admin-control-center-foundation-v1`

Frontend draft PR: #6

Frontend runtime head proven before the shell-ownership refactor: `dce02f8aa85b38614880e08050658a21c7a5e76e`.

Shell-ownership refactor candidate prepared as Git commit `45ae656836d66fa37a4eafeab0f9ec35366bfade`; branch ref move and external proof are still required before this candidate can be counted as proven.

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

Vercel deployment `dpl_CL1G6czWUhDQSRrW3Ntszp9MQrDH` proved the prior runtime with Biome, strict TypeScript, 5 test files / 13 tests and Vite production build green.

## Shell ownership / diagnostics candidate

TDD RED was observed in Vercel for commit `41dd7577126469da0f39c7d7e0a69dbb07e44a44`: the new smoke test failed specifically because `BUILD local` was absent while the administrative session was gated.

The candidate implementation:

- exposes `BUILD`, environment and Admin API/session state before session unlock;
- keeps the same diagnostic data visible after session validation;
- creates `components/shell/OperationalDiagnostics.tsx`;
- creates `components/shell/SessionGate.tsx`;
- creates `components/shell/ControlCenterSidebar.tsx`;
- creates shell-specific CSS ownership;
- reduces `App.tsx` toward composition/navigation + feature routing;
- updates the visual canonical progress to 14.83%.

F1.5/F1.8 remain open until branch attachment and external `check + typecheck + tests + build` proof.

## Foundation still open

- F1.2 — dedicated admin deployment/hostname boundary;
- F1.5 — candidate implemented, proof pending;
- F1.8 — candidate implemented, proof pending;
- F1.10 — reproducible dependency/build boundary; no dedicated/root lockfile yet.

## Backend evidence

PR #89 remains read-only with 15/15 canonical workflows green on `4aa82ade8da9557c9fe04ef6188e8af9cadf2768`; no mutation HTTP endpoint exists.
