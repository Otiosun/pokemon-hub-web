# Asset provenance — Pokémon Hub Web

Status: working provenance register for the non-commercial fan project.

The presence of an asset in a public API, package, or GitHub repository is **not** treated as a grant of ownership or a general commercial license. This file records where visual material used by the Hub comes from so providers can be replaced and credits/legal posture can be reviewed later.

## Current visual providers

| Role | Provider | Repository / host | License / rights posture | Local policy |
| --- | --- | --- | --- | --- |
| animated 3D specimen | Generations x Cobblemon conversion pipeline | source packs resolved by the project pipeline | Pokémon-derived visual material; fan-project use only unless separately cleared | Primary #001–386 3D path. Convert offline; publish through replaceable external storage; never bulk-commit the GLB catalog. |
| type symbols | partywhale / pokemon-type-icons | `partywhale/pokemon-type-icons` | MIT; copyright James Watkins (2022) | All 18 vector geometries are vendored in `TypeIcon`, normalized behind one component, with source/license recorded here. |
| HOME / official artwork / lightweight sprite | PokéAPI sprites | `PokeAPI/sprites` | Pokémon imagery remains subject to the respective rights holders | Visual fallback / lightweight species representation. Never treat repository availability as commercial permission. |
| expressive portraits | PMDCollab / SpriteCollab | `PMDCollab/SpriteCollab` | Community submissions may use CC BY-NC 4.0 with attribution; official-derived material remains subject to original rights | Manifest must distinguish community-authored and official-derived material. Preserve contributor/source information. |
| Box / collection mini-sprites and item visuals | PokéSprite | `msikma/pokesprite` | project code/data may be MIT; Pokémon sprite images remain © Nintendo / Creatures / GAME FREAK | Functional lightweight representation only. Do not describe Pokémon sprite images themselves as MIT. |
| animated 2D fallback | Pokémon Showdown / Smogon sprites | Showdown / Smogon sprite hosts | code and community contributions vary; Pokémon imagery remains protected and some sprite licensing is not a clean blanket grant | Fallback/laboratory use only. Do not make this a licensing foundation. |
| generic UI glyphs | Phosphor Icons | `phosphor-icons/*` / `@phosphor-icons/react` | MIT | Preferred family for new generic UI because weights/duotone can support the instrument language. Introduce when the global shell is implemented; do not mix icon families ad hoc. |
| existing generic UI glyphs | Lucide / local SVG | existing UI | library / local rules as recorded per asset | Existing simple glyphs may remain; migrate only when it improves consistency. |

## Pokémon type icons — verified and vendored 2026-08-26

`partywhale/pokemon-type-icons` exposes the 18 standard type symbols as SVG and includes an MIT license. The vector geometry is now stored locally in `src/visual-assets/TypeIcon.tsx`; the browser does not make a runtime GitHub request to render type symbols.

`TypeIcon` owns PT-BR/English type resolution, normalized `viewBox`, sizing via CSS, and a deterministic fallback for unknown values. Feature code consumes the component instead of knowing the upstream provider path.

Types: Normal, Fire, Water, Electric, Grass, Ice, Fighting, Poison, Ground, Flying, Psychic, Bug, Rock, Ghost, Dragon, Dark, Steel, Fairy.

Upstream license notice: MIT License, copyright (c) 2022 James Watkins. Keep this provenance entry with any redistribution of the adapted vector set.

## Generations 3D — current contract

The previous spike preference for Pokémon 3D API as the primary 3D source is **superseded**. The current product contract is Generations x Cobblemon-derived conversion with:

- semantic Idle coverage #001–386;
- one persistent Three.js renderer/context;
- Idle-only + rotate + bounded zoom;
- generic auto-frame, no first-line per-species offsets;
- external/versioned asset delivery through `VITE_POKEMON_ASSET_BASE_URL`;
- 2D catalog/Box/Time representations so multiple WebGL contexts are never required.

Pokémon 3D API remains a historical spike/fallback candidate, not the primary architecture.

## Manifest / registry metadata

Every external visual role must be resolvable through a provider/registry and carry, where applicable:

- `provider`
- `role`
- `speciesId` / `form` / `variant`
- source repository, URL, or resolvable key
- `licenseKind` / rights posture
- author / contributor credit
- `lastVerifiedAt`
- fallback priority

URLs are representation details. The RPG domain stores Pokémon identity (`speciesId`, `form`, `shiny`, `instanceId`) and never persists a CDN/GLB/image URL as player-owned identity.

## Rules

1. Components consume resolved visual assets; provider-specific URL rules belong in the visual-asset layer.
2. A missing asset must degrade without breaking Pokémon access or shifting the layout catastrophically.
3. 3D failure must degrade to a useful 2D representation.
4. Do not mirror protected Pokémon catalogs into this repository by default.
5. Type/color is never the only information channel; icon + readable label remain available where meaning matters.
6. Preserve attribution and license text for open asset packs that require it.
7. Before any commercial release, stop and perform a dedicated rights/licensing review. Do not assume fan-project or public-repository material is commercially reusable.
