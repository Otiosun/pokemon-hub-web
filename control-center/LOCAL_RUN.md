# Control Center Core — Local Frontend

This frontend is intended to run against the isolated local Admin API prepared in `Otiosun/sla`.

Backend branch:

`prep/control-center-core-local-2026-09-03`

Backend operator runbook:

`docs/operator/control-center-core-local.md`

## Requirements

- Node.js `24.19.0`
- pnpm `11.23.0`
- backend Admin API already listening on `127.0.0.1:8787`

## Checkout and install

PowerShell:

```powershell
cd <PASTA_DO_POKEMON_HUB_WEB>
git fetch origin
git switch prep/control-center-core-local-2026-09-03
git pull --ff-only
pnpm install --frozen-lockfile
```

The root install materializes and installs the isolated Control Center workspace. If that postinstall was skipped, run:

```powershell
node control-center/scripts/materialize-lockfile.mjs
pnpm --dir control-center install --frozen-lockfile --ignore-scripts
```

## Local environment

Create `control-center/.env.local` from the existing `.env.example`:

```dotenv
VITE_CONTROL_CENTER_ENV=development
VITE_CONTROL_CENTER_API_BASE_URL=http://localhost:8787
VITE_CONTROL_CENTER_BUILD_LABEL=local
```

These variables identify the API location/build only. They do not contain a principal, role, capability or scope. Administrative authority is resolved by the backend from PostgreSQL.

## Verify before opening

```powershell
pnpm --dir control-center verify
```

This runs check/lint, TypeScript, tests, build and the JS performance budget.

## Start

```powershell
pnpm --dir control-center dev
```

Open:

`http://localhost:5173`

Expected local path:

`browser localhost:5173 -> Admin API localhost:8787 -> PostgreSQL local`

A new local PostgreSQL database contains no production players, so empty player searches are expected until demo/local bot data is present.

## Safety

- Do not add a frontend authentication bypass.
- Do not put an admin UUID in Vite/browser variables.
- Do not point this local frontend at a staging/production Admin API while local backend auth is enabled.
- Do not raise the performance budget to make a local change fit.
- No merge or production deployment is part of this handoff.
