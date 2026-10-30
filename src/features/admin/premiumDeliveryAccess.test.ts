import { describe, expect, it } from 'vitest';
import { canGrantPremiumDelivery, isPremiumDeliveryDelegate } from './premiumDeliveryAccess';
import type { PlayerPortalAdminAccess } from '../../player-api/playerPortalAdminClient';

const access = (owner: boolean, capabilities: string[]): PlayerPortalAdminAccess => ({
  principalId: '11111111-1111-4111-8111-111111111111', owner, capabilities,
});

describe('scoped Premium manual-delivery navigation', () => {
  it('never opens Premium for an ordinary ADM with broadly useful gameplay grants', () => {
    const admin = access(false, ['central.view', 'player.read', 'reward.grant', 'inventory.adjust']);
    expect(canGrantPremiumDelivery(admin)).toBe(false);
    expect(isPremiumDeliveryDelegate(admin)).toBe(false);
  });

  it('shows only a delegated delivery view when an owner grants the narrow capability', () => {
    const admin = access(false, ['central.view', 'player.read', 'premium.delivery.grant']);
    expect(canGrantPremiumDelivery(admin)).toBe(true);
    expect(isPremiumDeliveryDelegate(admin)).toBe(true);
  });

  it('still needs administrative access and respects removal of delegation', () => {
    expect(canGrantPremiumDelivery(access(false, ['premium.delivery.grant']))).toBe(false);
    expect(canGrantPremiumDelivery(access(false, ['central.view']))).toBe(false);
    expect(canGrantPremiumDelivery(access(true, ['central.view']))).toBe(true);
    expect(isPremiumDeliveryDelegate(access(true, ['central.view']))).toBe(false);
  });
});
