# Pokémon Control Center — checkpoint

Date: 2026-08-30

**Canonical progress: 16.17%**

Frontend branch: `feat/admin-control-center-foundation-v1` (PR #6 DRAFT).
Backend branch: `feat/admin-api-read-foundation-v1` (PR #89 DRAFT).

Frontend shell implementation head proved before canonical-progress sync: `c8f85b87f1aa7fd3ce4fb7e9881546a37c502e72`.
External proof commit: `9aa37492ef0030ac64fa6a033c068e1a838c666b`, derived exactly from that feature head with only a root `package.json` postinstall hook.
Workers Build proof: `2ee51fc6-c46b-449e-acb7-862652b35309` — SUCCESS.
Backend proven head: `4aa82ade8da9557c9fe04ef6188e8af9cadf2768`.

Canonical score: F0 5.00% + F1 6.67% + F2 4.50% = **16.17%**.

The shell refactor materializes explicit ownership under `components/shell`: `SessionGate`, `OperationalDiagnostics`, `ControlCenterSidebar` and shell-specific CSS. The source tree now has real `app/features/components/lib` boundaries and `App.tsx` is focused on composition/orchestration rather than owning shell internals.

Operational diagnostics expose `BUILD`, `AMBIENTE` and `ADMIN API` state both during the fail-closed session gate and in the authenticated shell. The smoke test requires these diagnostics before administrative tools are released.

The verification gate isolated one formatting-only defect in `ControlCenterSidebar.tsx`; all other new shell files passed Biome independently, formatter + check proved no semantic sidebar lint defect, and the canonical import format was applied to the real branch.

The full disposable proof ran `npm run verify:control-center` with no formatter/fixes. That command chains Biome check, TypeScript strict, Vitest and Vite production build with `&&`; the Workers SUCCESS therefore proves all four gates exited zero for the shell implementation tree.

F1.5 and F1.8 are promoted. F1.2 remains open because no dedicated administrative deployment/hostname exists. F1.10 remains open because reproducible dependency locking for the Control Center is not yet closed.

The UI progress constant was synchronized to 16.17% only after the Drive checklist/checkpoint became canonical. This synchronization changes the frontend head and therefore requires one fresh final `verify:control-center` proof before this checkpoint is treated as the final runtime head.

No merge, production deployment or mutation endpoint is authorized.
