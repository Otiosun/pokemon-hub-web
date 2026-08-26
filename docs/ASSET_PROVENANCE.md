# Asset provenance — Pokémon Hub Web

Status: working provenance register for the non-commercial fan project.

The presence of an asset in a public API or GitHub repository is **not** treated as a grant of ownership or a general commercial license. This file records where visual material used by the Hub comes from so providers can be replaced and credits/legal posture can be reviewed later.

## Current spike providers

| Role | Provider | Repository / host | Local policy |
| --- | --- | --- | --- |
| 3D GLB | Pokémon 3D API | `Pokemon-3D-api/assets` | External URL only; never bulk-commit GLBs. Pokémon IP remains with its respective rights holders. |
| HOME / official artwork / temporary icon | PokéAPI sprites | `PokeAPI/sprites` | External URL only; use as visual fallback/source during the fan-project spike. |
| expressive portraits | PMDCollab / SpriteCollab | `PMDCollab/SpriteCollab` | Preserve contributor/source information. Community material has its own attribution/licensing policy; official-derived material remains subject to original rights. |
| animated fallback | Pokémon Showdown | `play.pokemonshowdown.com/sprites` | External URL only; fallback/laboratory use. |

## Verified spike entries — 2026-08-25

Species: Bulbasaur #001, Charmander #004, Squirtle #007.

- 3D convention: `models/opt/regular/{nationalDexId}.glb` from Pokémon 3D API.
- PokéAPI HOME and official-artwork paths verified against the public sprites repository conventions.
- PMDCollab directories `portrait/0001`, `portrait/0004`, `portrait/0007` verified to expose `Normal.png`, `Happy.png`, `Angry.png`, and `Pain.png`.
- Pokémon Showdown's current sprite index exposes the animated `ani` family used as the final lightweight fallback.

## Rules

1. Store species/form/variant identity, never an external URL as player-owned Pokémon identity.
2. Components receive resolved assets from the Visual Asset System; they do not construct provider URLs.
3. 3D failure must degrade to 2D without breaking Pokémon access.
4. Do not mirror protected catalogs into this repository by default.
5. Before any commercial release, stop and perform a dedicated rights/licensing review; do not assume fan-project sources are commercially reusable.
