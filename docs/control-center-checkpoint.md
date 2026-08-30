# Pokémon Control Center — checkpoint

Date: 2026-08-30

**Canonical progress: 9.75%**

The canonical decision log and definitive checklist live in Google Drive under `RPG Pokémon — Engine Narrativa e Mecânica/05_ADMIN_CONTROL_CENTER`.

## Current implementation

Frontend branch: `feat/admin-control-center-foundation-v1`

Frontend draft PR: #6

Frontend runtime head last materially changed before this docs sync: `01fa739b0080be0126819c97eae141c3a9446af1`

Backend branch: `feat/admin-api-read-foundation-v1`

Backend draft PR: #89

Backend proven head: `6fb41358f9a162ba84f770992dd067afaf94fc40`

Both PRs remain DRAFT. No merge or production administrative release is authorized.

## Backend Admin API evidence

The read-only administrative boundary is materialized and proven:

- Fastify 5.12.1 with reproducible lockfile/supply-chain validation;
- `ADMIN_API_ENABLED` is opt-in and disabled by default;
- Cloudflare Access JWT verification with RS256/JWKS, `iss`, `aud`, `kid`, signature, `exp`, `nbf` and `iat`;
- empty `sub` service tokens cannot become human administrators;
- provider-qualified identity maps to `admin_principals.identity_ref` and requires an ACTIVE internal principal;
- email and Cloudflare groups are not RPG authority;
- `GET /admin/v1/session`;
- `GET /admin/v1/players`;
- `GET /admin/v1/players/:id`;
- exact-origin CORS, `no-store`, defensive response headers and server-generated correlation IDs;
- strict input allowlists; client input cannot choose principal, environment, roles, capabilities or scopes;
- individual Player 360 target comes from the validated route UUID;
- unexpected errors are sanitized;
- composition reuses the canonical Admin Registry, AdminService and Player360/domain repositories;
- no HTTP mutation endpoint exists in this slice;
- when the Admin API is disabled, the existing WhatsApp runtime behavior remains unchanged.

### Authenticated rate-limit hardening

The backend/post-auth half of F2.11 is now implemented and proven:

- rate limiting is mandatory in Admin API server composition;
- budgets are keyed by authenticated principal + allowlisted read operation (`session.read`, `player.search`, `player.read`);
- denial happens before the handler with HTTP `429` + `Retry-After`;
- migration `0026_admin_api_rate_limit_buckets.sql` stores shared mutable PostgreSQL buckets with atomic increment/window reset;
- there is no per-window row growth: one bucket per `(principal_id, operation)`;
- two independent API limiter instances/pools share the same database budget;
- distributed concurrency proof with budget 3 and 6 simultaneous requests yields exactly 3 allow + 3 deny and persisted count 6;
- the limiter fails closed if its persistence path fails.

F2.11 is **not complete** yet. The complementary edge/pre-auth layer must still be configured and proven: Cloudflare WAF/rate limiting against brute-force/API abuse plus a non-bypassable origin boundary. The backend budget remains a second authoritative layer rather than being replaced by edge counters.

### Backend proof

Head `6fb41358f9a162ba84f770992dd067afaf94fc40` closed **15/15 canonical workflows green**, including CI, Admin Proof, Security Integrity, WhatsApp, Performance, Narrative, Catalog, Onboarding, Progression, Economy, World, Encounter, Battle, Capture and Release Foundation.

The general CI proved:

- canonical lint + format;
- strict TypeScript;
- **59 test files / 251 tests green**;
- the distributed PostgreSQL Admin API rate-limit integration proof;
- runtime schema verification;
- migrator/runtime privilege separation;
- logical backup + disposable restore;
- forward migration from `0025_mutation_abuse_admission.sql` to `0026_admin_api_rate_limit_buckets.sql`, preserving durable state and converging on rerun;
- logical rollback to known-good state.

Security Integrity is also green after the PostgreSQL integration proof was correctly placed under `tests/db/`; no skip or security gate was weakened.

## Frontend Control Center evidence

The frontend is no longer a fake-authority shell:

- API client uses `credentials: include`; React does not receive/inject the Cloudflare Access assertion;
- session states are fail-closed: loading, ready, unauthenticated, forbidden and unavailable;
- administrative menus are derived from effective capabilities returned by `/admin/v1/session`;
- `MASTER` is only a visual label for backend `OWNER_SECURITY_ADMIN`;
- current environment and principal come from the real administrative session;
- `player.read_sensitive` is derived from the real capability set;
- Player 360 search uses the backend contract, cursor pagination and server-returned UUIDs;
- search results include enough operational context to reduce wrong-player selection without indiscriminate sensitive disclosure;
- individual Player 360 overview is read from the real API;
- loading/empty/error states preserve correlation IDs for investigation;
- unsupported `COOLDOWNS` and `PUNISHMENTS_FLAGS` remain explicit instead of being invented in the UI;
- no mutation UI/API is exposed.

### Frontend hardening performed

Biome 2.5.10 was executed against the Control Center boundary using a Vercel preview as an external executor when GitHub Actions could not start the modified PR workflow. The canonical formatter output was applied back to source. During that process the executor found two real TypeScript issues: nullable session-error narrowing and an impossible loading-state comparison. Both were fixed without weakening type or format gates. The shell smoke test was updated to prove the fail-closed session gate rather than the former mock shell.

Temporary package-script changes used only to extract the formatted artifact were removed; canonical verification scripts are restored.

## Verification blocker on the current frontend runtime head

The current frontend runtime head still lacks a valid final execution of `check + typecheck + tests + build`.

- GitHub Actions jobs associated with the workflow introduced/modified in this PR are being rejected before any runner step (`steps: null`). This is an executor/trust-policy failure, not a code-test result.
- Vercel successfully executed prior intermediate heads and was used to run Biome/typecheck diagnostics, but it stopped materializing new previews after the rapid sequence of branch commits; therefore older READY previews are not proof for the current runtime head.
- This documentation-only commit does not count as new runtime evidence and any CI executor behavior caused by it must not be interpreted as a runtime regression or pass.
- No green result is being inferred from older previews.

## Checklist state

- F0: 10/10 = 5.00%
- F1: 6/12 = 4.00%
- F2: 1/16 = 0.75%
- Total: **9.75%**

Backend evidence makes F2.7, F2.8, F2.9, F2.12 and F2.14 candidates for formal promotion once the combined slice gate is closed. The backend/post-auth portion of F2.11 is now proven, but F2.11 remains open until the edge/pre-auth abuse boundary is configured/proven. F2.15 remains open because its DoD requires the complete expired/revoked-session + privilege denial + BOLA/BFLA + mass-assignment package.

## Current gates

- PR #6 remains DRAFT. Do not merge until a clean current-runtime-head Control Center `check + typecheck + tests + build` is observed and the dedicated admin deployment boundary is reviewed.
- PR #89 remains DRAFT despite 15/15 green. Do not merge/deploy until the frontend boundary, threat model/environment config and release decision are jointly reviewed.
- Do not add production admin credentials, a production hostname or mutations merely because the read-only slice exists.
