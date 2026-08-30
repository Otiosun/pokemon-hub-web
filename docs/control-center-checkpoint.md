# Pokémon Control Center — checkpoint

Date: 2026-08-30

**Canonical progress: 14.83%**

Frontend branch: `feat/admin-control-center-foundation-v1` (PR #6 DRAFT).
Backend branch: `feat/admin-api-read-foundation-v1` (PR #89 DRAFT).

Latest proven frontend runtime before shell refactor: `dce02f8aa85b38614880e08050658a21c7a5e76e`.
Attached shell-refactor runtime: `ad6c509d69ca8c8b69f7f463d239610a03900a1b`.
Backend proven head: `4aa82ade8da9557c9fe04ef6188e8af9cadf2768`.

Canonical score: F0 5.00% + F1 5.33% + F2 4.50% = **14.83%**.

TDD RED was observed in Vercel for `41dd7577126469da0f39c7d7e0a69dbb07e44a44`: the gated shell lacked `BUILD local`.

The attached shell refactor adds explicit build/environment/Admin API diagnostics, `components/shell` ownership, a dedicated SessionGate, OperationalDiagnostics and ControlCenterSidebar, plus shell CSS. `App.tsx` is reduced to composition/feature routing and the visual canonical progress is updated to 14.83%.

F1.5 and F1.8 remain open until an external `check + typecheck + tests + build` proves the attached runtime. F1.2 and F1.10 also remain open.

No merge, production deployment or mutation endpoint is authorized.
