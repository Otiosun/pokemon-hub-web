# Pokémon Control Center — Deployment Boundary

Status: deployment architecture defined; dedicated deployment project is still pending.

## Non-negotiable boundary

The Control Center is an administrative application, not a route of the public Pokémon Hub.

It may temporarily share this Git repository for code review and selected design assets, but production/staging deployment must have its own project, hostname, environment configuration and access policy.

## Intended topology

Public player experience:

`pokemon-hub-web -> public/player deployment`

Administrative control plane:

`control-center/ -> dedicated admin deployment -> Cloudflare Access -> Admin API`

The final administrative hostname must be protected before the application becomes operational. A public Hub deployment must never become an accidental bypass to the Control Center.

## Build boundary

Control Center root: `control-center/`

Required independent proof:

```bash
npm run verify:control-center
```

This executes the Control Center's own lint/format diagnostics, TypeScript check, unit/smoke tests and production build instead of treating the public Hub build as proof.

## Environment contract

The app uses these browser-visible, non-secret build settings:

- `VITE_CONTROL_CENTER_ENV` — `development | staging | production`
- `VITE_CONTROL_CENTER_API_BASE_URL` — required outside development
- `VITE_CONTROL_CENTER_BUILD_LABEL` — diagnostic build/revision label

Secrets, Access service credentials, private keys, PostgreSQL credentials and WhatsApp credentials must never use `VITE_*` or enter the browser bundle.

## Required deployment separation

A dedicated admin deployment must provide:

- independent project/deployment ID;
- dedicated admin hostname;
- environment-specific API base URL;
- explicit STAGING/PRODUCTION distinction;
- Cloudflare Access policy before operational use;
- separate Access application audience for staging and production;
- no public fallback route that bypasses Access;
- rollback history independent from the public Hub;
- deploy/smoke evidence recorded in the Control Center checkpoint.

## Current state

The app builds independently, but PR previews are currently produced by the existing `pokemon-hub-web` Vercel project. That is useful as build evidence only and is NOT the final administrative deployment architecture.

Checklist consequence:

- documentation of the separate deployment boundary may be complete;
- the item requiring a materially independent build/deploy boundary remains open until a dedicated deployment project/hostname exists.

## Production prohibition

Do not enable real administrative mutations, production credentials or a production admin hostname merely because the frontend builds successfully. Authentication, Admin API, origin policy, session/identity validation and the later release gates remain mandatory.
