import { readTeamDraftOrder } from '../team/teamSession';
import { applyCollectionFilters } from './collectionFilters';
import { readCollectionSession } from './collectionSession';
import { getTeamPreview, OWNED_POKEMON_PREVIEW, type OwnedPokemonPreview } from './ownedPokemonPreview';

export type OwnedMovePreview = {
  name: string;
  type: string;
  pp: string;
};

export type OwnedPokemonDetailPreview = OwnedPokemonPreview & {
  nature: string;
  ability: string;
  heldItem: string;
  origin: string;
  moves: OwnedMovePreview[];
};

type OwnedBuildPreview = Pick<
  OwnedPokemonDetailPreview,
  'nature' | 'ability' | 'heldItem' | 'origin' | 'moves'
>;

// Build/origin are instance state. Never key this data by species/dex: two owned
// Pokemon of the same species may have completely different builds and history.
const BUILD_BY_INSTANCE_ID: Record<string, OwnedBuildPreview> = {
  'pkm-bulbasaur-b1': { nature: 'Calma', ability: 'Overgrow', heldItem: '—', origin: 'Treino do treinador', moves: [{ name: 'Tackle', type: 'Normal', pp: '35/35' }, { name: 'Growl', type: 'Normal', pp: '40/40' }, { name: 'Vine Whip', type: 'Planta', pp: '25/25' }, { name: 'Poison Powder', type: 'Veneno', pp: '35/35' }] },
  'pkm-charmander-a1': { nature: 'Firme', ability: 'Blaze', heldItem: 'Oran Berry', origin: 'Parceiro inicial', moves: [{ name: 'Scratch', type: 'Normal', pp: '35/35' }, { name: 'Ember', type: 'Fogo', pp: '25/25' }, { name: 'Smokescreen', type: 'Normal', pp: '20/20' }, { name: 'Dragon Rage', type: 'Dragão', pp: '10/10' }] },
  'pkm-squirtle-a1': { nature: 'Cauta', ability: 'Torrent', heldItem: '—', origin: 'Parceiro do treinador', moves: [{ name: 'Tackle', type: 'Normal', pp: '35/35' }, { name: 'Water Gun', type: 'Água', pp: '25/25' }, { name: 'Withdraw', type: 'Água', pp: '40/40' }, { name: 'Bite', type: 'Sombrio', pp: '25/25' }] },
  'pkm-caterpie-b1': { nature: 'Dócil', ability: 'Shield Dust', heldItem: '—', origin: 'Captura em rota', moves: [{ name: 'Tackle', type: 'Normal', pp: '35/35' }, { name: 'String Shot', type: 'Inseto', pp: '40/40' }] },
  'pkm-pikachu-a1': { nature: 'Alegre', ability: 'Static', heldItem: 'Light Ball', origin: 'Captura em rota', moves: [{ name: 'Quick Attack', type: 'Normal', pp: '30/30' }, { name: 'Thunder Shock', type: 'Elétrico', pp: '30/30' }, { name: 'Electro Ball', type: 'Elétrico', pp: '10/10' }, { name: 'Double Team', type: 'Normal', pp: '15/15' }] },
  'pkm-zubat-b1': { nature: 'Ingênua', ability: 'Inner Focus', heldItem: '—', origin: 'Captura em caverna', moves: [{ name: 'Absorb', type: 'Planta', pp: '25/25' }, { name: 'Supersonic', type: 'Normal', pp: '20/20' }, { name: 'Astonish', type: 'Fantasma', pp: '15/15' }, { name: 'Bite', type: 'Sombrio', pp: '25/25' }] },
  'pkm-growlithe-c1': { nature: 'Firme', ability: 'Intimidate', heldItem: '—', origin: 'Captura em rota', moves: [{ name: 'Bite', type: 'Sombrio', pp: '25/25' }, { name: 'Ember', type: 'Fogo', pp: '25/25' }, { name: 'Leer', type: 'Normal', pp: '30/30' }, { name: 'Howl', type: 'Normal', pp: '40/40' }] },
  'pkm-gastly-a1': { nature: 'Tímida', ability: 'Levitate', heldItem: '—', origin: 'Captura noturna', moves: [{ name: 'Lick', type: 'Fantasma', pp: '30/30' }, { name: 'Hypnosis', type: 'Psíquico', pp: '20/20' }, { name: 'Mean Look', type: 'Normal', pp: '5/5' }, { name: 'Curse', type: 'Fantasma', pp: '10/10' }] },
  'pkm-lapras-c1': { nature: 'Calma', ability: 'Water Absorb', heldItem: 'Mystic Water', origin: 'Encontro especial', moves: [{ name: 'Water Pulse', type: 'Água', pp: '20/20' }, { name: 'Ice Shard', type: 'Gelo', pp: '30/30' }, { name: 'Sing', type: 'Normal', pp: '15/15' }, { name: 'Body Slam', type: 'Normal', pp: '15/15' }] },
  'pkm-eevee-a1': { nature: 'Dócil', ability: 'Run Away', heldItem: 'Soothe Bell', origin: 'Presente', moves: [{ name: 'Quick Attack', type: 'Normal', pp: '30/30' }, { name: 'Sand Attack', type: 'Terrestre', pp: '15/15' }, { name: 'Baby-Doll Eyes', type: 'Fada', pp: '30/30' }, { name: 'Swift', type: 'Normal', pp: '20/20' }] },
  'pkm-dragonair-a1': { nature: 'Modesta', ability: 'Shed Skin', heldItem: 'Dragon Fang', origin: 'Evolução registrada', moves: [{ name: 'Dragon Tail', type: 'Dragão', pp: '10/10' }, { name: 'Aqua Jet', type: 'Água', pp: '20/20' }, { name: 'Thunder Wave', type: 'Elétrico', pp: '20/20' }, { name: 'Agility', type: 'Psíquico', pp: '30/30' }] },
  'pkm-umbreon-c1': { nature: 'Cauta', ability: 'Synchronize', heldItem: 'Black Glasses', origin: 'Evolução por vínculo', moves: [{ name: 'Confuse Ray', type: 'Fantasma', pp: '10/10' }, { name: 'Feint Attack', type: 'Sombrio', pp: '20/20' }, { name: 'Moonlight', type: 'Fada', pp: '5/5' }, { name: 'Quick Attack', type: 'Normal', pp: '30/30' }] },
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseContextLocation(returnHref: string) {
  return new URL(returnHref, 'https://pokemon-hub.local');
}

function orderedTeamContext() {
  const canonical = getTeamPreview();
  const draftOrder = readTeamDraftOrder();
  if (!draftOrder) return canonical;
  const byId = new Map(canonical.map((pokemon) => [pokemon.instanceId, pokemon]));
  const ordered = draftOrder
    .map((instanceId) => byId.get(instanceId))
    .filter((pokemon): pokemon is OwnedPokemonPreview => Boolean(pokemon));
  return ordered.length === canonical.length ? ordered : canonical;
}

function collectionContextSequence(returnHref: string) {
  const context = parseContextLocation(returnHref);
  if (context.pathname === '/team' || context.pathname === '/team/') {
    return orderedTeamContext();
  }
  if (
    (context.pathname === '/jornada' || context.pathname === '/jornada/') &&
    context.searchParams.get('pokemonContext') === 'lead'
  ) {
    return getTeamPreview().slice(0, 1);
  }

  const session = readCollectionSession();
  const speciesRaw = context.searchParams.get('species');
  const speciesDex = speciesRaw ? Number.parseInt(speciesRaw, 10) : null;
  const needle = normalize(session.query);
  const base = OWNED_POKEMON_PREVIEW.filter((pokemon) => {
    if (speciesDex && pokemon.dex !== speciesDex) return false;
    if (session.mode === 'favorites' && !pokemon.favorite) return false;
    if (!needle) return true;
    return normalize(pokemon.nickname).includes(needle) || normalize(pokemon.species).includes(needle);
  });

  return applyCollectionFilters(base, session.filters);
}

export function getOwnedPokemonDetailPreview(instanceId: string): OwnedPokemonDetailPreview | null {
  const pokemon = OWNED_POKEMON_PREVIEW.find((item) => item.instanceId === instanceId);
  if (!pokemon) return null;
  const build: OwnedBuildPreview = BUILD_BY_INSTANCE_ID[pokemon.instanceId] ?? {
    nature: '—',
    ability: '—',
    heldItem: '—',
    origin: 'Registro importado',
    moves: [],
  };
  return { ...pokemon, ...build };
}

export function getOwnedPokemonNeighbours(instanceId: string, returnHref = '/pokemon') {
  const contextual = collectionContextSequence(returnHref);
  const sequence = contextual.some((item) => item.instanceId === instanceId)
    ? contextual
    : [...OWNED_POKEMON_PREVIEW];

  if (sequence.length <= 1) return { previous: null, next: null };

  const index = sequence.findIndex((item) => item.instanceId === instanceId);
  if (index < 0) return { previous: null, next: null };
  const previous = sequence[(index - 1 + sequence.length) % sequence.length] ?? null;
  const next = sequence[(index + 1) % sequence.length] ?? null;
  return { previous, next };
}
