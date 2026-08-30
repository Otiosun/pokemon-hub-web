# Pokémon Control Center — checkpoint

Date: 2026-08-30

**Canonical progress: 9.75%**

The canonical decision log and definitive checklist live in Google Drive under `RPG Pokémon — Engine Narrativa e Mecânica/05_ADMIN_CONTROL_CENTER`.

## Current implementation

Frontend branch: `feat/admin-control-center-foundation-v1`

Frontend draft PR: #6

Frontend head at this checkpoint: `01fa739b0080be0126819c97eae141c3a9446af1`

Backend branch: `feat/admin-api-read-foundation-v1`

Backend draft PR: #89

Backend head at this checkpoint: `df601cd5eefa3de2c103e8b4786c4b36daf87115`

Both PRs remain DRAFT. No merge or production administrative release is authorized.

## Backend Admin API evidence

The read-only administrative boundary is now materialized and proven:

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

### Backend proof

Head `df601cd5eefa3de2c103e8b4786c4b36daf87115` closed **15/15 canonical workflows green**, including CI, Admin Proof, Security Integrity, WhatsApp, Performance, Narrative, Catalog, Onboarding, Progression, Economy, World, Encounter, Battle, Capture and Release Foundation. The general CI also passed unit/PostgreSQL, schema, privilege-separation, migration and rollback proofs.

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

## Verification blocker on the current frontend head

The current frontend head still lacks a valid final execution of `check + typecheck + tests + build`.

- GitHub Actions jobs associated with the workflow introduced/modified in this PR are being rejected before any runner step (`steps: null`). This is an executor/trust-policy failure, not a code-test result.
- Vercel successfully executed prior intermediate heads and was used to run Biome/typecheck diagnostics, but it stopped materializing new previews after the rapid sequence of branch commits; therefore older READY previews are not proof for the current head.
- No green result is being inferred from either condition.

## Checklist state

- F0: 10/10 = 5.00%
- F1: 6/12 = 4.00%
- F2: 1/16 = 0.75%
- Total: **9.75%**

Backend evidence makes F2.7, F2.8, F2.9, F2.12 and F2.14 candidates for formal promotion once the combined slice gate is closed. F2.15 remains open because its DoD requires the complete expired/revoked-session + privilege denial + BOLA/BFLA + mass-assignment package.

## Current gates

- PR #6 remains DRAFT. Do not merge until a clean current-head Control Center `check + typecheck + tests + build` is observed and the dedicated admin deployment boundary is reviewed.
- PR #89 remains DRAFT despite 15/15 green. Do not merge/deploy until the frontend boundary, threat model/environment config and release decision are jointly reviewed.
- Do not add production admin credentials, a production hostname or mutations merely because the read-only slice exists.
