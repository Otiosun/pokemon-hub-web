# Pokémon Control Center

Administrative control plane for the Pokémon RPG.

## Status

Foundation only. This app intentionally has no production authentication, Admin API connection or state mutations yet.

## Boundary

The Control Center may share this repository with the public Pokémon Hub, but it is designed as an independently built and deployed administrative application.

It must never:

- connect directly to PostgreSQL;
- become a second source of game mechanics;
- expose raw SQL, arbitrary JavaScript or generic object PATCH as admin tools;
- treat frontend capability checks as authorization;
- fake runtime health or LiveOps data when no backend contract exists.

The target path is:

`Control Center -> Admin API/BFF -> Admin Operation Registry / Player 360 -> domain owners -> PostgreSQL`

## Local verification

```bash
pnpm install --frozen-lockfile
pnpm verify
```

A dedicated lockfile/CI gate is still part of Phase 1 and must be completed before this foundation is considered merge-ready.

## Canonical product decisions

The canonical decision log, definitive checklist and checkpoint live in the RPG Pokémon Drive under `05_ADMIN_CONTROL_CENTER`.

Current canonical Control Center progress at foundation creation: **5.67%**.
