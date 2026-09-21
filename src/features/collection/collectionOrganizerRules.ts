export function blocksLastTeamMemberBoxMove({
  sourceInTeam,
  teamSize,
  targetOccupied,
}: {
  sourceInTeam: boolean;
  teamSize: number;
  targetOccupied: boolean;
}) {
  return sourceInTeam && teamSize <= 1 && !targetOccupied;
}
