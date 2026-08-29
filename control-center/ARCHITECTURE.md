# Control Center integration boundary

## Runtime separation

The public Pokémon Hub and the administrative Control Center may coexist in this repository, but they are separate applications and must be deployed independently.

The Control Center is not a hidden route of the public player bundle.

## Authority path

```text
Control Center Web
  -> Admin API / BFF
    -> authentication/session/environment guard
      -> Admin Operation Registry / Player 360
        -> domain owner
          -> PostgreSQL / ledgers / audit / outbox
```

## Frontend responsibilities

- render capability-aware navigation;
- collect validated human input;
- present simulation, confirmation and approval state;
- preserve target/environment context;
- present typed errors and verification evidence;
- never infer successful mutation from optimistic UI alone.

## Frontend non-responsibilities

- mechanical calculations that determine authoritative outcomes;
- database access;
- permission decisions;
- generic rollback;
- arbitrary content expressions/scripts;
- fake operational telemetry.

## Planned product order

1. Foundation
2. Auth + Admin API/BFF
3. App shell + global search
4. Player 360 + support operations
5. Content Studio
6. LiveOps
7. Operations/security
8. Analytics/copilot
9. Hardening/UAT/release
