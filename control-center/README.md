# Pokémon Control Center Core

Administrative support console for the Pokémon RPG.

## Current scope

The original full Control Center roadmap was superseded on 2026-09-03 by the frozen **Control Center Core / Support Console v1** scope. The old percentage checklist is historical and is not an outstanding commitment to finish the former 100% roadmap.

The preserved Core includes administrative read/support surfaces such as Player 360, content inspection, operational health/queues/incidents, audit reconstruction and the analytics slices completed before the scope freeze.

HTTP authority remains server-owned and intentionally constrained to **READ + PREPARE ONLY**. The browser is not an authorization source and must never gain simulate/confirm/approve/apply authority.

## Boundary

The Control Center shares this repository with the public Pokémon Hub but remains an independently built administrative application.

It must never:

- connect directly to PostgreSQL;
- become a second source of game mechanics;
- expose raw SQL, arbitrary JavaScript or generic object PATCH as admin tools;
- treat frontend capability checks as authorization;
- fake runtime health or LiveOps data when no backend contract exists;
- supply principal, role, capability, scope or environment authority from the browser.

The path is:

`Control Center -> Admin API/BFF -> Admin Operation Registry / read services -> domain owners -> PostgreSQL`

## Local run

See [`LOCAL_RUN.md`](./LOCAL_RUN.md).

The local frontend consumes the loopback Admin API at `http://localhost:8787`. Local development authentication is implemented only in the backend prep branch and remains fail-closed outside development + loopback.

## Verification

From `control-center/`:

```bash
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm verify` includes lint/check, TypeScript, tests, Vite build and the Control Center performance budget.

## Canonical product decision

Drive document:

`CONTROL CENTER CORE — ESCOPO CANÔNICO V1 — 2026-09-03`

ID: `1Cibr-ne5Qr5frTVlvbKhkpYYnMJFfqhwnfN-1rU7Zyg`
