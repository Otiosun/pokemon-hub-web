# Pokémon Control Center — checkpoint

Date: 2026-08-29

**Canonical progress: 9.75%**

The canonical decision log and definitive checklist live in Google Drive under `RPG Pokémon — Engine Narrativa e Mecânica/05_ADMIN_CONTROL_CENTER`.

## Current implementation

Frontend branch: `feat/admin-control-center-foundation-v1`

Frontend draft PR: #6

Backend branch: `feat/admin-api-read-foundation-v1`

Backend draft PR: #89

The Control Center remains isolated from public-player authority and no production administrative mutation is exposed.

### Foundation evidence

- independent `control-center/` application build root;
- fixed Node/pnpm/React/Vite/TypeScript toolchain;
- strict/fail-fast environment config contract;
- six-area information architecture;
- capability-aware navigation contract;
- persistent environment/operator context in the shell;
- responsive desktop/mobile layout;
- global-search foundation;
- real-contract Player 360 read-only surface without fake player data;
- isolated Control Center lint/typecheck/tests/production build proven in Vercel on a green head;
- deployment separation documented in `control-center/DEPLOYMENT.md`;
- dedicated deployment project/hostname is still pending.

### Admin API / authentication evidence

The backend draft PR now contains:

- transport-neutral Player 360 read facade;
- anti-spoofing rule: client input cannot choose `principalId`, environment or route target;
- canonical authentication protocol separated from player auth;
- Cloudflare Access chosen as initial external identity/perimeter provider;
- `sub`-based provider-qualified `identity_ref` mapping into existing `admin_principals`;
- ACTIVE internal principal required even for a valid external identity;
- PostgreSQL identity lookup adapter;
- adversarial tests for client principal spoofing, email authority confusion, disabled principals and unknown identities.

Fastify 5 is the chosen future HTTP adapter but is not installed or exposed yet. JWT cryptographic verification, session/origin integration and public read endpoints are still open.

## Checklist state

- F0: 10/10 = 5.00%
- F1: 6/12 = 4.00%
- F2: 1/16 = 0.75%
- Total: **9.75%**

F1 items still open include the dedicated deployment boundary, source formatting gate, final source ownership structure, frontend health/build diagnostics, smoke-test proof and reproducible lockfile/build definition.

## Current gates

- PR #6 remains DRAFT; do not merge while its current format/reproducibility gates are open.
- PR #89 remains DRAFT; do not merge until the current backend CI rerun is green and the intended slice is reviewed.
- Do not add production admin credentials, a production hostname or mutations merely because the UI/build exists.
