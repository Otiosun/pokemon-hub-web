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

The complete conversion pipeline is an offline/release process and must not be used to rebuild the full Gen I-III catalog on every application deploy.

Until the immutable external catalog is live, the application build materializes a bounded deployment-local fallback under `/research/generations` through `build-generations-player-preview.py`. That fallback exists to keep representative 3D and the active showcase team testable; it is not the production-complete catalog. Once `VITE_POKEMON_ASSET_BASE_URL` points at the published catalog, the external versioned manifest is the authoritative 3D source.

Converter verification also runs a representative smoke set covering TRANM, GFBANM, SMD, Scyther/Shedinja and the converter regressions Suicune #245 and Lugia #249.

## Storage direction

Cloudflare R2 is the preferred candidate for the first hosted catalog because the generated Gen I-III catalog is roughly hundreds of MB, should not live in Git, and object delivery should not consume the application's deployment size budget. Storage/provider remains replaceable behind the base URL contract.

For the first production catalog, point `VITE_POKEMON_ASSET_BASE_URL` at an immutable version root such as `https://<bucket>.r2.dev/pokemon/v1`. The frontend requests `manifest.json` from that root before enabling 3D for a species.

The public asset origin must:

- allow browser `GET`/`HEAD` from the Hub origins through CORS;
- serve `manifest.json` and `asset.json` as JSON, `.glb` with a binary model content type, and textures as images;
- cache versioned model/texture files immutably while allowing the versioned `manifest.json` to be refreshed;
- keep published version paths immutable instead of replacing files underneath an existing `vN`.

The Vercel CSP explicitly allows Cloudflare R2 public hosts (`*.r2.dev` and `*.cloudflarestorage.com`) for both fetches and textures. If a custom CDN hostname is introduced later, add that hostname to both `connect-src` and `img-src` in the same release that configures the new base URL. Cloudflare Worker previews do not use `vercel.json`, so their response-header policy must be kept equivalent if a CSP is added there later.

## RPG integration boundary

Later the backend/API returns mechanical/player truth such as:

```json
{
  "instanceId": "...",
  "speciesId": 4,
  "speciesSlug": "charmander",
  "formSlug": "charmander",
  "shiny": false
}
```

The frontend visual asset provider resolves that data to the current visual manifest. The backend does not need to know R2 URLs, GLB paths or Three.js details.
