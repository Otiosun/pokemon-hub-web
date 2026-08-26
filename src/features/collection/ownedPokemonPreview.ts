export type OwnedPokemonPreview = {
  instanceId: string;
  dex: number;
  species: string;
  nickname: string;
  level: number;
  types: string[];
  favorite: boolean;
  shiny: boolean;
  box: string;
  teamSlot: number | null;
};

export const OWNED_POKEMON_PREVIEW: readonly OwnedPokemonPreview[] = [
  { instanceId: 'pkm-charmander-a1', dex: 4, species: 'Charmander', nickname: 'Brasa', level: 18, types: ['Fogo'], favorite: true, shiny: false, box: 'Parceiros', teamSlot: 1 },
  { instanceId: 'pkm-squirtle-a1', dex: 7, species: 'Squirtle', nickname: 'Casco', level: 17, types: ['Água'], favorite: false, shiny: false, box: 'Parceiros', teamSlot: 2 },
  { instanceId: 'pkm-pikachu-a1', dex: 25, species: 'Pikachu', nickname: 'Faísca', level: 21, types: ['Elétrico'], favorite: true, shiny: false, box: 'Parceiros', teamSlot: 3 },
  { instanceId: 'pkm-eevee-a1', dex: 133, species: 'Eevee', nickname: 'Mimo', level: 16, types: ['Normal'], favorite: true, shiny: false, box: 'Parceiros', teamSlot: 4 },
  { instanceId: 'pkm-gastly-a1', dex: 92, species: 'Gastly', nickname: 'Névoa', level: 19, types: ['Fantasma', 'Veneno'], favorite: false, shiny: false, box: 'Parceiros', teamSlot: 5 },
  { instanceId: 'pkm-dragonair-a1', dex: 148, species: 'Dragonair', nickname: 'Íris', level: 31, types: ['Dragão'], favorite: false, shiny: false, box: 'Parceiros', teamSlot: 6 },
  { instanceId: 'pkm-bulbasaur-b1', dex: 1, species: 'Bulbasaur', nickname: 'Bulbasaur', level: 12, types: ['Planta', 'Veneno'], favorite: false, shiny: false, box: 'Treino', teamSlot: null },
  { instanceId: 'pkm-caterpie-b1', dex: 10, species: 'Caterpie', nickname: 'Caterpie', level: 6, types: ['Inseto'], favorite: false, shiny: false, box: 'Treino', teamSlot: null },
  { instanceId: 'pkm-zubat-b1', dex: 41, species: 'Zubat', nickname: 'Zubat', level: 11, types: ['Veneno', 'Voador'], favorite: false, shiny: false, box: 'Treino', teamSlot: null },
  { instanceId: 'pkm-growlithe-c1', dex: 58, species: 'Growlithe', nickname: 'Growlithe', level: 15, types: ['Fogo'], favorite: false, shiny: false, box: 'Reserva', teamSlot: null },
  { instanceId: 'pkm-lapras-c1', dex: 131, species: 'Lapras', nickname: 'Maré', level: 24, types: ['Água', 'Gelo'], favorite: true, shiny: false, box: 'Reserva', teamSlot: null },
  { instanceId: 'pkm-umbreon-c1', dex: 197, species: 'Umbreon', nickname: 'Noite', level: 27, types: ['Sombrio'], favorite: true, shiny: true, box: 'Reserva', teamSlot: null },
] as const;

export function getTeamPreview() {
  return OWNED_POKEMON_PREVIEW
    .filter((pokemon) => pokemon.teamSlot !== null)
    .sort((a, b) => (a.teamSlot ?? 99) - (b.teamSlot ?? 99));
}
