import { describe, expect, it } from 'vitest';
import { buildEvolutionTree } from './pokedexSpeciesRuntime';

describe('Pokedex evolution tree', () => {
  it('preserves evolution conditions on the edge into the evolved species', () => {
    const tree = buildEvolutionTree({
      species: {
        name: 'gastly',
        url: 'https://pokeapi.co/api/v2/pokemon-species/92/',
      },
      evolves_to: [
        {
          species: {
            name: 'haunter',
            url: 'https://pokeapi.co/api/v2/pokemon-species/93/',
          },
          evolution_details: [
            {
              min_level: 25,
              trigger: { name: 'level-up' },
            },
          ],
          evolves_to: [
            {
              species: {
                name: 'gengar',
                url: 'https://pokeapi.co/api/v2/pokemon-species/94/',
              },
              evolution_details: [
                {
                  trigger: { name: 'trade' },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(tree?.species.name).toBe('Gastly');
    expect(tree?.children[0]?.conditions).toContain('Nível 25');
    expect(tree?.children[0]?.children[0]?.conditions).toContain('Troca');
  });

  it('keeps branching evolutions as siblings instead of flattening them into stages', () => {
    const tree = buildEvolutionTree({
      species: {
        name: 'eevee',
        url: 'https://pokeapi.co/api/v2/pokemon-species/133/',
      },
      evolves_to: [
        {
          species: {
            name: 'vaporeon',
            url: 'https://pokeapi.co/api/v2/pokemon-species/134/',
          },
          evolution_details: [
            {
              trigger: { name: 'use-item' },
              item: { name: 'water-stone' },
            },
          ],
        },
        {
          species: {
            name: 'jolteon',
            url: 'https://pokeapi.co/api/v2/pokemon-species/135/',
          },
          evolution_details: [
            {
              trigger: { name: 'use-item' },
              item: { name: 'thunder-stone' },
            },
          ],
        },
      ],
    });

    expect(tree?.children.map((child) => child.species.name)).toEqual([
      'Vaporeon',
      'Jolteon',
    ]);
    expect(tree?.children[0]?.conditions).toEqual(['Usar Water Stone']);
    expect(tree?.children[1]?.conditions).toEqual(['Usar Thunder Stone']);
  });
});
