let draftOrder: string[] | null = null;

export function readTeamDraftOrder() {
  return draftOrder ? [...draftOrder] : null;
}

export function readTeamDraftSlot(instanceId: string) {
  if (!draftOrder) return null;
  const index = draftOrder.indexOf(instanceId);
  return index >= 0 ? index + 1 : null;
}

export function rememberTeamDraftOrder(instanceIds: readonly string[]) {
  draftOrder = [...instanceIds];
}

export function clearTeamDraftOrder() {
  draftOrder = null;
}
