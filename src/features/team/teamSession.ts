let draftOrder: string[] | null = null;

export function readTeamDraftOrder() {
  return draftOrder ? [...draftOrder] : null;
}

export function rememberTeamDraftOrder(instanceIds: readonly string[]) {
  draftOrder = [...instanceIds];
}

export function clearTeamDraftOrder() {
  draftOrder = null;
}
