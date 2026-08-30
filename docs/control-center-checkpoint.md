# Pokémon Control Center — checkpoint

Date: 2026-08-30

**Canonical progress: 14.83%**

The canonical decision log and definitive checklist live in Google Drive under `RPG Pokémon — Engine Narrativa e Mecânica/05_ADMIN_CONTROL_CENTER`.

## Current implementation

Frontend branch: `feat/admin-control-center-foundation-v1`

Frontend draft PR: #6

Frontend runtime head last materially changed before this docs sync: `01fa739b0080be0126819c97eae141c3a9446af1`

Frontend verification head: `dce02f8aa85b38614880e08050658a21c7a5e76e`

Backend branch: `feat/admin-api-read-foundation-v1`

Backend draft PR: #89

Backend proven head: `4aa82ade8da9557c9fe04ef6188e8af9cadf2768`

Both PRs remain DRAFT. No merge or production administrative release is authorized.

## Frontend verification gate — PROVEN

Vercel deployment `dpl_CL1G6czWUhDQSRrW3Ntszp9MQrDH` finished READY after cloning the exact PR head `dce02f8aa85b38614880e08050658a21c7a5e76e`.

The root canonical `verify` script executed `verify:control-center` first and proved the current administrative boundary with:

- Biome check over 19 Control Center files, no fixes applied;
- TypeScript strict check green;
- 5 test files / 13 tests green;
- Vite 8.2.2 production build green;
- 25 modules transformed;
- generated admin bundle without privileged credentials being introduced by this slice.

The public Hub verification continued afterward. Existing public CSS warnings are separate debt and were not used to relax or mask the isolated administrative proof.

GitHub Actions for the PR-owned workflow still fails before runner steps, but the checklist explicitly accepts CI/check **or equivalent proof before merge**. The Vercel execution above is the valid equivalent proof for this head.

### F1 promoted

- F1.4 — TypeScript strict + lint/format without relaxed gates: **DONE**.
- F1.9 — test runner + app-shell smoke: **DONE**.

F1 is now **8/12 = 5.33%**.

Still open:

- F1.2 — no dedicated admin deployment/hostname yet; Hub preview is not the final admin deployment boundary;
- F1.5 — `App.tsx` still carries too much composition (~16.8 KB) and there is no sufficiently explicit `components` ownership boundary yet;
- F1.8 — build label is visible, but explicit operational health diagnostics are not yet materialized;
- F1.10 — no dedicated `control-center` lockfile and no root lockfile currently prove dependency reproducibility.

## Backend Admin API read-only — PROVEN

PR `Otiosun/sla#89` at `4aa82ade8da9557c9fe04ef6188e8af9cadf2768` closed **15/15 canonical workflows green**.

General CI proved:

- canonical lint + format;
- TypeScript strict;
- **60 test files / 260 tests green**;
- Fastify boundary 12/12 green;
- adversarial authorization package 5/5 green;
- PostgreSQL distributed rate-limit integration green;
- runtime schema verification;
- migrator/runtime privilege separation;
- backup + disposable restore;
- forward migration `0025_mutation_abuse_admission.sql` → `0026_admin_api_rate_limit_buckets.sql`;
- logical rollback to known-good state.

### Server authority and transport guarantees

- Cloudflare Access JWT is cryptographically verified before internal authority resolution;
- external identity resolves to an ACTIVE `admin_principals` principal;
- `/admin/v1/session` returns backend-derived principal, roles, capabilities, scopes and environment;
- `/admin/v1/players` and `/admin/v1/players/:id` reuse canonical Player360/domain authority;
- transport schemas are strict and allowlisted;
- client input cannot choose principal, environment, roles, capabilities or scopes;
- exact-origin CORS is enforced;
- unexpected errors become sanitized `ADMIN_INTERNAL_ERROR` responses;
- no mutation HTTP endpoint exists.

The mass-assignment matrix explicitly attacks `principalId`, `environment`, `roles`, `capabilities` and `scopes`; each attempt is rejected with 400 and the domain handler is not called.

### F2 promoted

- F2.7 — strict Admin API/BFF boundary + validated input/output: **DONE**.
- F2.8 — effective whoami/session endpoint: **DONE**.
- F2.9 — server-side authorization; frontend never authority: **DONE**.
- F2.12 — minimal explicit CORS/origin policy: **DONE**.
- F2.14 — typed/sanitized errors, no stack/SQL/secret exposure: **DONE**.

Together with F2.1, F2 is now **6/16 = 4.50%**.

Still open:

- provider-level session lifecycle/revocation/logout/expiration;
- CSRF decision against the final session model;
- MFA/step-up for privileged operations;
- formal sensitive-data redaction DoD;
- F2.11 edge/pre-auth WAF rate limiting + non-bypassable origin (backend/post-auth limiter is already proven);
- end-to-end correlation into future AdminOperation/audit mutations;
- real staging/production credential/session separation;
- F2.15 provider-level expired/revoked session proof (BOLA/BFLA/privilege denial/mass assignment/internal kill switch are already green).

## Checklist state

- F0: 10/10 = 5.00%
- F1: 8/12 = 5.33%
- F2: 6/16 = 4.50%
- Total: **14.83%**

## Current gates

- PR #6 remains DRAFT. The previous generic verification blocker is closed, but the PR still must not merge until the remaining F1 deployment/reproducibility/ownership diagnostics gates are reviewed.
- PR #89 remains DRAFT despite 15/15 green. Do not merge/deploy until real Cloudflare session/edge configuration, frontend boundary, threat model/environment config and an explicit release decision are complete.
- Do not add production admin credentials, a production hostname or mutations merely because the read-only slice exists.
