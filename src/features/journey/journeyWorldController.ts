import {
  getPlayerPortalWorldLocation,
  travelPlayerPortalWorld,
  type PlayerPortalFetcher,
  type PlayerPortalWorldLocation,
} from '../../player-api/playerPortalClient';

export type JourneyWorldState =
  | { status: 'ready'; location: PlayerPortalWorldLocation }
  | { status: 'unauthenticated' };

export type JourneyWorldTravelState =
  | { status: 'ready'; location: PlayerPortalWorldLocation; replayed: boolean }
  | { status: 'unauthenticated' };

export async function loadJourneyWorld(
  fetcher?: PlayerPortalFetcher,
): Promise<JourneyWorldState> {
  const result = await getPlayerPortalWorldLocation(fetcher);
  if (result.status === 'unauthenticated') return { status: 'unauthenticated' };
  return { status: 'ready', location: result.location };
}

export async function travelJourneyWorld(
  currentLocation: PlayerPortalWorldLocation,
  destinationAreaId: string,
  idempotencyKey: string,
  fetcher?: PlayerPortalFetcher,
): Promise<JourneyWorldTravelState> {
  const result = await travelPlayerPortalWorld(
    {
      destinationAreaId,
      expectedRevision: currentLocation.revision,
      idempotencyKey,
    },
    fetcher,
  );
  if (result.status === 'unauthenticated') return { status: 'unauthenticated' };
  return {
    status: 'ready',
    location: result.travel.to,
    replayed: result.travel.replayed,
  };
}
