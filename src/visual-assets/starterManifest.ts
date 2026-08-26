export type StarterId = 1 | 4 | 7;
export type PortraitEmotion = 'Normal' | 'Happy' | 'Angry' | 'Pain';

export type AssetSource = {
  provider: 'Pokemon3DAPI' | 'PokeAPI' | 'PMDCollab' | 'PokemonShowdown';
  url: string;
  role: 'model3d' | 'artwork' | 'portrait' | 'icon' | 'animated-sprite';
};

export type StarterVisualManifest = {
  id: StarterId;
  dex: string;
  slug: string;
  name: string;
  types: readonly string[];
  model3d: AssetSource;
  artworkHome: AssetSource;
  artworkOfficial: AssetSource;
  icon: AssetSource;
  animatedSprite: AssetSource;
  portraits: Record<PortraitEmotion, AssetSource>;
};

const pokemon3dUrl = (id: StarterId) =>
  `https://raw.githubusercontent.com/Pokemon-3D-api/assets/refs/heads/main/models/opt/regular/${id}.glb`;

const pokeApiUrl = (path: string) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${path}`;

const pmdPortraitUrl = (id: StarterId, emotion: PortraitEmotion) =>
  `https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/portrait/${String(id).padStart(4, '0')}/${emotion}.png`;

function createStarter(
  id: StarterId,
  name: string,
  slug: string,
  types: readonly string[],
): StarterVisualManifest {
  const portrait = (emotion: PortraitEmotion): AssetSource => ({
    provider: 'PMDCollab',
    role: 'portrait',
    url: pmdPortraitUrl(id, emotion),
  });

  return {
    id,
    dex: String(id).padStart(3, '0'),
    slug,
    name,
    types,
    model3d: {
      provider: 'Pokemon3DAPI',
      role: 'model3d',
      url: pokemon3dUrl(id),
    },
    artworkHome: {
      provider: 'PokeAPI',
      role: 'artwork',
      url: pokeApiUrl(`other/home/${id}.png`),
    },
    artworkOfficial: {
      provider: 'PokeAPI',
      role: 'artwork',
      url: pokeApiUrl(`other/official-artwork/${id}.png`),
    },
    icon: {
      provider: 'PokeAPI',
      role: 'icon',
      url: pokeApiUrl(`versions/generation-viii/icons/${id}.png`),
    },
    animatedSprite: {
      provider: 'PokemonShowdown',
      role: 'animated-sprite',
      url: `https://play.pokemonshowdown.com/sprites/ani/${slug}.gif`,
    },
    portraits: {
      Normal: portrait('Normal'),
      Happy: portrait('Happy'),
      Angry: portrait('Angry'),
      Pain: portrait('Pain'),
    },
  };
}

export const starterVisuals = [
  createStarter(1, 'Bulbasaur', 'bulbasaur', ['Grass', 'Poison']),
  createStarter(4, 'Charmander', 'charmander', ['Fire']),
  createStarter(7, 'Squirtle', 'squirtle', ['Water']),
] as const;

export function getStarterVisual(id: StarterId): StarterVisualManifest {
  const starter = starterVisuals.find((entry) => entry.id === id);
  if (!starter) {
    throw new Error(`Unknown starter visual manifest: ${id}`);
  }
  return starter;
}

export function getArtworkFallbacks(starter: StarterVisualManifest): readonly AssetSource[] {
  return [starter.artworkHome, starter.artworkOfficial, starter.animatedSprite];
}
