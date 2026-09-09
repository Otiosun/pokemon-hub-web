import { useCallback, useEffect, useState } from 'react';
import type { PlayerPortalWorldLocation } from '../../player-api/playerPortalClient';
import { loadJourneyWorld, travelJourneyWorld } from './journeyWorldController';
import './journey-world-panel.css';

type JourneyWorldPanelState =
  | { kind: 'disconnected' }
  | { kind: 'loading' }
  | { kind: 'ready'; location: PlayerPortalWorldLocation }
  | {
      kind: 'traveling';
      location: PlayerPortalWorldLocation;
      destinationAreaId: string;
    }
  | { kind: 'error'; location: PlayerPortalWorldLocation | null };

export function JourneyWorldPanel({ enabled }: { enabled: boolean }) {
  const [state, setState] = useState<JourneyWorldPanelState>(() =>
    enabled ? { kind: 'loading' } : { kind: 'disconnected' },
  );

  const load = useCallback(async () => {
    if (!enabled) {
      setState({ kind: 'disconnected' });
      return;
    }

    setState({ kind: 'loading' });
    try {
      const result = await loadJourneyWorld();
      if (result.status === 'unauthenticated') {
        setState({ kind: 'disconnected' });
        return;
      }
      setState({ kind: 'ready', location: result.location });
    } catch {
      setState({ kind: 'error', location: null });
    }
  }, [enabled]);

  useEffect(() => {
    let active = true;

    if (!enabled) {
      setState({ kind: 'disconnected' });
      return () => {
        active = false;
      };
    }

    setState({ kind: 'loading' });
    void loadJourneyWorld()
      .then((result) => {
        if (!active) return;
        if (result.status === 'unauthenticated') {
          setState({ kind: 'disconnected' });
          return;
        }
        setState({ kind: 'ready', location: result.location });
      })
      .catch(() => {
        if (active) setState({ kind: 'error', location: null });
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  const travel = async (destinationAreaId: string) => {
    if (state.kind !== 'ready') return;

    const currentLocation = state.location;
    setState({ kind: 'traveling', location: currentLocation, destinationAreaId });

    try {
      const result = await travelJourneyWorld(
        currentLocation,
        destinationAreaId,
        `journey:${globalThis.crypto.randomUUID()}`,
      );
      if (result.status === 'unauthenticated') {
        setState({ kind: 'disconnected' });
        return;
      }
      setState({ kind: 'ready', location: result.location });
    } catch {
      setState({ kind: 'error', location: currentLocation });
    }
  };

  if (state.kind === 'disconnected') {
    return (
      <section className="journey-world-panel is-disconnected" data-journey-world="disconnected">
        <div className="journey-world-kicker">EXPLORAR</div>
        <strong>MAPA INDISPONÍVEL</strong>
        <p>Conecte seu registro oficial do Hub para consultar sua posição e viajar.</p>
      </section>
    );
  }

  if (state.kind === 'loading') {
    return (
      <section className="journey-world-panel is-loading" data-journey-world="loading" aria-busy="true">
        <div className="journey-world-kicker">EXPLORAR</div>
        <strong>LENDO MAPA</strong>
        <div className="journey-world-scan" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    );
  }

  const location = state.location;
  if (state.kind === 'error' && location === null) {
    return (
      <section className="journey-world-panel is-error" data-journey-world="error">
        <div className="journey-world-kicker">EXPLORAR</div>
        <strong>MAPA FORA DE ALCANCE</strong>
        <p>O Hub não conseguiu confirmar sua localização agora.</p>
        <button type="button" className="journey-world-retry" onClick={() => void load()}>
          TENTAR NOVAMENTE
        </button>
      </section>
    );
  }

  if (location === null) return null;
  const travelingDestination = state.kind === 'traveling' ? state.destinationAreaId : null;
  const isBusy = state.kind === 'traveling';

  return (
    <section
      className={`journey-world-panel is-ready${isBusy ? ' is-traveling' : ''}${state.kind === 'error' ? ' has-error' : ''}`}
      data-journey-world={state.kind}
      aria-busy={isBusy}
    >
      <div className="journey-world-heading">
        <div>
          <span className="journey-world-kicker">EXPLORAR</span>
          <strong>{location.areaDisplayName}</strong>
          <small>{location.regionDisplayName}</small>
        </div>
        <span className={`journey-world-safe${location.safePoint ? ' is-safe' : ''}`}>
          {location.safePoint ? 'ÁREA SEGURA' : 'ÁREA DE CAMPO'}
        </span>
      </div>

      {location.requiresRelocation ? (
        <p className="journey-world-warning">Sua área atual exige realocação antes de continuar.</p>
      ) : null}

      {state.kind === 'error' ? (
        <div className="journey-world-inline-error" role="alert">
          <span>A viagem não foi confirmada. Sua última posição confirmada foi preservada.</span>
          <button type="button" onClick={() => void load()}>
            RECARGAR MAPA
          </button>
        </div>
      ) : null}

      <div className="journey-world-connections" role="group" aria-label="Rotas disponíveis">
        <div className="journey-world-connections-head">
          <span>ROTAS CONECTADAS</span>
          <small>REV. {location.revision}</small>
        </div>

        {location.connections.length === 0 ? (
          <p className="journey-world-empty">Nenhuma rota disponível a partir desta área.</p>
        ) : (
          location.connections.map((connection) => {
            const travelingHere = travelingDestination === connection.destinationAreaId;
            const locked = !connection.available;
            return (
              <button
                key={connection.connectionId}
                type="button"
                className="journey-world-route"
                disabled={isBusy || locked}
                onClick={() => void travel(connection.destinationAreaId)}
              >
                <span className="journey-world-route-copy">
                  <strong>{connection.destinationDisplayName}</strong>
                  <small>
                    {travelingHere
                      ? 'VIAJANDO…'
                      : locked
                        ? connection.missingUnlockKeys.length > 0
                          ? `REQUER ${connection.missingUnlockKeys.join(', ')}`
                          : 'ROTA BLOQUEADA'
                        : 'VIAJAR'}
                  </small>
                </span>
                <span className="journey-world-route-arrow" aria-hidden="true">
                  {locked ? '×' : '›'}
                </span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
