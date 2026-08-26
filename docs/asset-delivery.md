# Pokémon visual asset delivery

## Runtime contract

The player/frontend identifies Pokémon by domain data such as `speciesId`, form and shiny state. It never persists a provider URL as Pokémon identity.

Generated 3D assets are delivered from an external object store/CDN through one public base URL:

`VITE_POKEMON_ASSET_BASE_URL`

Research/local builds may fall back to `/research/generations`.

## Versioned object layout

Production assets should be immutable and versioned, for example:

```text
pokemon/v1/
  manifest.json
  001-bulbasaur/
    asset.json
    model.glb
    material-body.png
    material-eyes.png
  004-charmander/
    ...
```

A future catalog release becomes `pokemon/v2/`; do not overwrite a published release in place.

## Frontend loading rules

- One active WebGL renderer in normal player UX.
- Team, Box and Pokédex grids use lightweight 2D representations only.
- The currently displayed Pokémon remains visible while the next asset is loading.
- Stale requests are cancelled/ignored when switching rapidly.
- Model/material resources are disposed after replacement.
- Rendering pauses when the viewer is out of viewport or the document is hidden.
- Mobile uses reduced DPR and low-power WebGL preference.
- 3D failure must fall back to artwork/sprite rather than blank UI.

## Pipeline

`Generations packs -> semantic resolver -> format decoder (TRANM/GFBANM/SMD) -> material bake -> idle-only web asset -> manifest -> object storage/CDN`

The conversion pipeline is an offline/release process. It must not run during every normal Vercel application deploy.

## Storage direction

Cloudflare R2 is the preferred candidate for the first hosted catalog because the generated Gen I-III catalog is roughly hundreds of MB, should not live in Git, and object delivery should not consume the application's deployment size budget. Storage/provider remains replaceable behind the base URL contract.

## RPG integration boundary

Later the backend/API returns mechanical/player truth such as:

```json
{
  "instanceId": "...",
  "speciesId": 4,
  "form": "default",
  "shiny": false
}
```

The frontend visual asset provider resolves that data to the current visual manifest. The backend does not need to know R2 URLs, GLB paths or Three.js details.
