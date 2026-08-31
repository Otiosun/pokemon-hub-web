import type { Player360Overview } from '../../lib/api/admin-api';

export function WorldLocationPanel({ player }: { readonly player: Player360Overview }) {
  const location = player.location;
  const active =
    location.areaId !== null && location.enteredAt !== null && location.revision !== null;

  return (
    <section className="world-location-panel" aria-labelledby="world-location-title">
      <div className="world-location-heading">
        <div>
          <span className="panel-kicker">MUNDO &amp; LOCALIZAÇÃO</span>
          <h3 id="world-location-title">Onde o jogador está agora.</h3>
          <p>
            Esta aba mostra apenas o estado de localização. Encounter, batalha e efeitos pertencem à
            próxima superfície operacional.
          </p>
        </div>
        <span className="muted-badge">READ-ONLY</span>
      </div>

      {active ? (
        <article className="world-location-current">
          <span className="panel-kicker">LOCALIZAÇÃO ATUAL</span>
          <strong>{location.areaId}</strong>
          <dl>
            <div>
              <dt>Entrada registrada</dt>
              <dd>{location.enteredAt}</dd>
            </div>
            <div>
              <dt>Revisão</dt>
              <dd>REV {location.revision}</dd>
            </div>
          </dl>
        </article>
      ) : (
        <div className="world-location-empty">
          <strong>Sem localização ativa registrada.</strong>
          <p>O read model não possui uma área atual para este jogador.</p>
        </div>
      )}
    </section>
  );
}
