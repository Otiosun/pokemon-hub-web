import { OWNED_POKEMON_PREVIEW, type OwnedPokemonPreview } from './ownedPokemonPreview';

export type OwnedMovePreview = {
  name: string;
  type: string;
  pp: string;
};

export type OwnedPokemonDetailPreview = OwnedPokemonPreview & {
  sex: 'M' | 'F' | '—';
  nature: string;
  ability: string;
  heldItem: string;
  origin: string;
  moves: OwnedMovePreview[];
};

const BUILD_BY_DEX: Record<number, Pick<OwnedPokemonDetailPreview, 'sex' | 'nature' | 'ability' | 'heldItem' | 'origin' | 'moves'>> = {
  1: { sex: 'M', nature: 'Calma', ability: 'Overgrow', heldItem: '—', origin: 'Treino do treinador', moves: [{ name: 'Tackle', type: 'Normal', pp: '35/35' }, { name: 'Growl', type: 'Normal', pp: '40/40' }, { name: 'Vine Whip', type: 'Planta', pp: '25/25' }, { name: 'Poison Powder', type: 'Veneno', pp: '35/35' }] },
  4: { sex: 'M', nature: 'Firme', ability: 'Blaze', heldItem: 'Oran Berry', origin: 'Parceiro inicial', moves: [{ name: 'Scratch', type: 'Normal', pp: '35/35' }, { name: 'Ember', type: 'Fogo', pp: '25/25' }, { name: 'Smokescreen', type: 'Normal', pp: '20/20' }, { name: 'Dragon Rage', type: 'Dragão', pp: '10/10' }] },
  7: { sex: 'F', nature: 'Cauta', ability: 'Torrent', heldItem: '—', origin: 'Parceiro do treinador', moves: [{ name: 'Tackle', type: 'Normal', pp: '35/35' }, { name: 'Water Gun', type: 'Água', pp: '25/25' }, { name: 'Withdraw', type: 'Água', pp: '40/40' }, { name: 'Bite', type: 'Sombrio', pp: '25/25' }] },
  10: { sex: 'F', nature: 'Dócil', ability: 'Shield Dust', heldItem: '—', origin: 'Captura em rota', moves: [{ name: 'Tackle', type: 'Normal', pp: '35/35' }, { name: 'String Shot', type: 'Inseto', pp: '40/40' }] },
  25: { sex: 'M', nature: 'Alegre', ability: 'Static', heldItem: 'Light Ball', origin: 'Captura em rota', moves: [{ name: 'Quick Attack', type: 'Normal', pp: '30/30' }, { name: 'Thunder Shock', type: 'Elétrico', pp: '30/30' }, { name: 'Electro Ball', type: 'Elétrico', pp: '10/10' }, { name: 'Double Team', type: 'Normal', pp: '15/15' }] },
  41: { sex: 'M', nature: 'Ingênua', ability: 'Inner Focus', heldItem: '—', origin: 'Captura em caverna', moves: [{ name: 'Absorb', type: 'Planta', pp: '25/25' }, { name: 'Supersonic', type: 'Normal', pp: '20/20' }, { name: 'Astonish', type: 'Fantasma', pp: '15/15' }, { name: 'Bite', type: 'Sombrio', pp: '25/25' }] },
  58: { sex: 'M', nature: 'Firme', ability: 'Intimidate', heldItem: '—', origin: 'Captura em rota', moves: [{ name: 'Bite', type: 'Sombrio', pp: '25/25' }, { name: 'Ember', type: 'Fogo', pp: '25/25' }, { name: 'Leer', type: 'Normal', pp: '30/30' }, { name: 'Howl', type: 'Normal', pp: '40/40' }] },
  92: { sex: 'M', nature: 'Tímida', ability: 'Levitate', heldItem: '—', origin: 'Captura noturna', moves: [{ name: 'Lick', type: 'Fantasma', pp: '30/30' }, { name: 'Hypnosis', type: 'Psíquico', pp: '20/20' }, { name: 'Mean Look', type: 'Normal', pp: '5/5' }, { name: 'Curse', type: 'Fantasma', pp: '10/10' }] },
  131: { sex: 'F', nature: 'Calma', ability: 'Water Absorb', heldItem: 'Mystic Water', origin: 'Encontro especial', moves: [{ name: 'Water Pulse', type: 'Água', pp: '20/20' }, { name: 'Ice Shard', type: 'Gelo', pp: '30/30' }, { name: 'Sing', type: 'Normal', pp: '15/15' }, { name: 'Body Slam', type: 'Normal', pp: '15/15' }] },
  133: { sex: 'F', nature: 'Dócil', ability: 'Run Away', heldItem: 'Soothe Bell', origin: 'Presente', moves: [{ name: 'Quick Attack', type: 'Normal', pp: '30/30' }, { name: 'Sand Attack', type: 'Terrestre', pp: '15/15' }, { name: 'Baby-Doll Eyes', type: 'Fada', pp: '30/30' }, { name: 'Swift', type: 'Normal', pp: '20/20' }] },
  148: { sex: 'F', nature: 'Modesta', ability: 'Shed Skin', heldItem: 'Dragon Fang', origin: 'Evolução registrada', moves: [{ name: 'Dragon Tail', type: 'Dragão', pp: '10/10' }, { name: 'Aqua Jet', type: 'Água', pp: '20/20' }, { name: 'Thunder Wave', type: 'Elétrico', pp: '20/20' }, { name: 'Agility', type: 'Psíquico', pp: '30/30' }] },
  197: { sex: 'M', nature: 'Cauta', ability: 'Synchronize', heldItem: 'Black Glasses', origin: 'Evolução por vínculo', moves: [{ name: 'Confuse Ray', type: 'Fantasma', pp: '10/10' }, { name: 'Feint Attack', type: 'Sombrio', pp: '20/20' }, { name: 'Moonlight', type: 'Fada', pp: '5/5' }, { name: 'Quick Attack', type: 'Normal', pp: '30/30' }] },
};

export function getOwnedPokemonDetailPreview(instanceId: string): OwnedPokemonDetailPreview | null {
  const pokemon = OWNED_POKEMON_PREVIEW.find((item) => item.instanceId === instanceId);
  if (!pokemon) return null;
  const build = BUILD_BY_DEX[pokemon.dex] ?? {
    sex: '—' as const,
    nature: '—',
    ability: '—',
    heldItem: '—',
    origin: 'Registro importado',
    moves: [],
  };
  return { ...pokemon, ...build };
}

export function getOwnedPokemonNeighbours(instanceId: string) {
  const index = OWNED_POKEMON_PREVIEW.findIndex((item) => item.instanceId === instanceId);
  if (index < 0) return { previous: null, next: null };
  const previous = OWNED_POKEMON_PREVIEW[(index - 1 + OWNED_POKEMON_PREVIEW.length) % OWNED_POKEMON_PREVIEW.length] ?? null;
  const next = OWNED_POKEMON_PREVIEW[(index + 1) % OWNED_POKEMON_PREVIEW.length] ?? null;
  return { previous, next };
}
