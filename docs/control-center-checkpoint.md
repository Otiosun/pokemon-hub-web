# Pokémon Control Center — checkpoint

Date: 2026-08-30

**Canonical progress: 16.17%**

Frontend branch: `feat/admin-control-center-foundation-v1` (PR #6 DRAFT).
Backend branch: `feat/admin-api-read-foundation-v1` (PR #89 DRAFT).

Frontend runtime head proved: `a63273420e6277516a1b9267cea62858dbec2d29`.
External proof commit: `7368e2876583f905f4a1d1aed6f55cce9a8a0de8`, derived exactly from that feature head with only a root `package.json` postinstall hook.
Workers Build proof: `1dec4b2f-60f8-41ba-927b-821f687662ca` — SUCCESS.
Backend proven head: `4aa82ade8da9557c9fe04ef6188e8af9cadf2768`.

Canonical score: F0 5.00% + F1 6.67% + F2 4.50% = **16.17%**.

The shell refactor materializes explicit ownership under `components/shell`: `SessionGate`, `OperationalDiagnostics`, `ControlCenterSidebar` and shell-specific CSS. The source tree now has real `app/features/components/lib` boundaries and `App.tsx` is focused on composition/orchestration rather than owning shell internals.

Operational diagnostics expose `BUILD`, `AMBIENTE` and `ADMIN API` state both during the fail-closed session gate and in the authenticated shell. The smoke test requires these diagnostics before administrative tools are released.

During final validation, the refactored `App.tsx` exposed one formatting-only defect: the final diagnostic copy in `FoundationView` exceeded the canonical Biome layout. `biome format` failed before the fix; after wrapping the JSX text, both `biome format control-center/src/App.tsx` and `biome check control-center/src/App.tsx` were proved green externally. No lint rule or runtime behavior was relaxed.

The final disposable proof ran `npm run verify:control-center` with no formatter/fixes. That command chains Biome check, TypeScript strict, Vitest and Vite production build with `&&`; Workers Build `1dec4b2f-60f8-41ba-927b-821f687662ca` completed SUCCESS, proving all four gates exited zero for runtime head `a63273420e6277516a1b9267cea62858dbec2d29`.

F1.5 and F1.8 are promoted. F1.2 remains open because no dedicated administrative deployment/hostname exists. F1.10 remains open because reproducible dependency locking for the Control Center is not yet closed.

The UI progress constant is synchronized to the Drive-canonical 16.17%.

No merge, production deployment or mutation endpoint is authorized.
