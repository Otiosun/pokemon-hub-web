import type { PlayerPortalAdminAccess } from '../../player-api/playerPortalAdminClient';

/**
 * This is ONLY a UI visibility check. The runtime must independently check
 * the owner or explicit premium.delivery.grant capability on every mutation.
 */
export function canGrantPremiumDelivery(admin: PlayerPortalAdminAccess): boolean {
  return admin.capabilities.includes('central.view') &&
    (admin.owner === true || admin.capabilities.includes('premium.delivery.grant'));
}

export function isPremiumDeliveryDelegate(admin: PlayerPortalAdminAccess): boolean {
  return admin.owner !== true && canGrantPremiumDelivery(admin);
}
