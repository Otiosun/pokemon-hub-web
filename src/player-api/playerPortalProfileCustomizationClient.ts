import {
  getAdvancedShowcaseSession,
  isAdvancedShowcaseActive,
  writeAdvancedShowcaseProfileCustomization,
} from '../showcase/advancedShowcase';
import {
  isPlayerPortalProfile,
  type PlayerPortalFetcher,
  type PlayerPortalProfile,
  type PlayerPortalProfileCustomization,
} from './playerPortalClient';

export type PlayerPortalProfileCustomizationUpdateResult =
  | { status: 'authenticated'; profile: PlayerPortalProfile }
  | { status: 'unauthenticated' };

export async function updatePlayerPortalProfileCustomization(
  customization: PlayerPortalProfileCustomization,
  fetcher: PlayerPortalFetcher = fetch,
  showcaseActive: boolean = isAdvancedShowcaseActive(),
): Promise<PlayerPortalProfileCustomizationUpdateResult> {
  if (showcaseActive) {
    writeAdvancedShowcaseProfileCustomization(customization);
    const session = getAdvancedShowcaseSession();
    if (session.status !== 'authenticated') {
      throw new Error('Advanced showcase profile is unavailable');
    }
    return { status: 'authenticated', profile: session.profile };
  }

  const response = await fetcher('/api/hub/player/profile-customization', {
    method: 'PUT',
    credentials: 'include',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(customization),
  });

  if (response.status === 401) return { status: 'unauthenticated' };
  if (!response.ok) {
    throw new Error(`Player portal profile update failed (${response.status})`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('Invalid player portal profile response');
  }

  if (!isRecord(body) || !isPlayerPortalProfile(body.profile)) {
    throw new Error('Invalid player portal profile response');
  }

  return { status: 'authenticated', profile: body.profile };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
