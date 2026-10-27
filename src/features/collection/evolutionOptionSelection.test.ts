import { describe, expect, it } from 'vitest';
import type { PlayerEvolutionOption } from '../../player-api/playerPortalEvolutionOptionsClient';
import { ambiguousEvolutionKeys, uniqueEvolutionOption } from './evolutionOptionSelection';

const level = (name: string): PlayerEvolutionOption => ({
  targetDisplayName: name,
  triggerKind: 'LEVEL',
  requiredLevel: 20,
  relativePhysicalStats: null,
  itemId: null,
  itemDisplayName: null,
  itemQuantity: null,
  conditionActive: null,
});
const item = (name: string, id: string): PlayerEvolutionOption => ({
  targetDisplayName: name,
  triggerKind: 'ITEM',
  requiredLevel: null,
  relativePhysicalStats: null,
  itemId: id,
  itemDisplayName: 'Pedra evolutiva',
  itemQuantity: '2',
  conditionActive: null,
});

describe('evolution choice safety for multiple catalog rules', () => {
  it('selects a unique level evolution', () => {
    expect(uniqueEvolutionOption([level('Charmeleon')], 'LEVEL')?.targetDisplayName)
      .toBe('Charmeleon');
    expect(ambiguousEvolutionKeys([level('Charmeleon')]).size).toBe(0);
  });

  it('blocks branching evolutions sharing one canonical trigger', () => {
    const branches = [level('Hitmonchan'), level('Hitmonlee')];
    expect(uniqueEvolutionOption(branches, 'LEVEL')).toBeNull();
    expect([...ambiguousEvolutionKeys(branches)]).toEqual(['LEVEL']);
  });

  it('separates two distinct evolution items but blocks the same item with two targets', () => {
    const a = '11111111-1111-4111-8111-111111111111';
    const b = '22222222-2222-4222-8222-222222222222';
    const alternatives = [item('Vaporeon', a), item('Jolteon', b)];
    expect(uniqueEvolutionOption(alternatives, `ITEM:${a}`)?.targetDisplayName)
      .toBe('Vaporeon');
    expect(ambiguousEvolutionKeys(alternatives).size).toBe(0);
    const duplicated = [item('Vaporeon', a), item('Alternate Form', a)];
    expect(uniqueEvolutionOption(duplicated, `ITEM:${a}`)).toBeNull();
    expect([...ambiguousEvolutionKeys(duplicated)]).toEqual([`ITEM:${a}`]);
  });
});
