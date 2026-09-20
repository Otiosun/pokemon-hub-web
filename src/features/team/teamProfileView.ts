import type { PlayerPortalProfile } from '../../player-api/playerPortalClient';

export interface TeamProfileMemberView {
  instanceId: string;
  displayName: string;
  dex: number | null;
  types: string[];
  level: number;
  currentHp: number;
  shiny: boolean;
  slotNo: number;
  catalogResolved: boolean;
}

export function createTeamProfileView(
  profile: PlayerPortalProfile | null,
): TeamProfileMemberView[] {
  if (!profile) return [];

  return [...profile.team]
    .sort((left, right) => left.slotNo - right.slotNo)
    .map((slot) => ({
      instanceId: slot.pokemonInstanceId,
      displayName: slot.displayName ?? 'REGISTRO INDISPONÍVEL',
      dex: slot.nationalDex,
      types: [...slot.typeNames],
      level: slot.level,
      currentHp: slot.currentHp,
      shiny: slot.shiny,
      slotNo: slot.slotNo,
      catalogResolved:
        slot.displayName !== null && slot.nationalDex !== null && slot.typeNames.length > 0,
    }));
}
