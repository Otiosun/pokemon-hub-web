import type { Player360Overview } from '../../lib/api/admin-api';
import {
  type Player360ActivityKind,
  type Player360ActivityView,
  parsePlayer360Activity,
} from './player360-activity';

const KIND_LABELS: Readonly<Record<Player360ActivityKind, string>> = {
  TRAINER_PROGRESS: 'PROGRESSÃO',
  INVENTORY: 'INVENTÁRIO',
  WALLET: 'WALLET',
  POKEMON_HISTORY: 'POKÉMON',
};

function compareNewest(left: Player360ActivityView, right: Player360ActivityView): number {
  return right.occurredAt.localeCompare(left.occurredAt);
}

export function ActivityHistoryPanel({ player }: { readonly player: Player360Overview }) {
  let activity: readonly Player360ActivityView[];
  try {
    activity = parsePlayer360Activity(player);
  } catch {
    return (
      <section className="activity-history-panel" role="alert">
        <span className="panel-kicker">ATIVIDADE &amp; HISTÓRICO</span>
        <h3>Atividade incompatível com o contrato atual.</h3>
        <p className="activity-history-empty">
          A Central bloqueou esta leitura para não apresentar uma linha do tempo sem validação.
        </p>
      </section>
    );
  }

  const ordered = [...activity].sort(compareNewest);

  return (
    <section className="activity-history-panel" aria-labelledby="activity-history-title">
      <div className="activity-history-heading">
        <div>
          <span className="panel-kicker">ATIVIDADE &amp; HISTÓRICO</span>
          <h3 id="activity-history-title">Linha do tempo recente do jogador.</h3>
          <p>
            Eventos do read model com origem e correlation quando disponíveis. Não substitui a
            reconstrução completa de audit administrativo.
          </p>
        </div>
        <span className="muted-badge">READ-ONLY</span>
      </div>

      {ordered.length === 0 ? (
        <p className="activity-history-empty">Nenhuma atividade recente registrada.</p>
      ) : (
        <ol className="activity-history-list">
          {ordered.map((entry, index) => (
            <li
              className="activity-history-entry"
              key={`${entry.kind}:${entry.occurredAt}:${entry.sourceType}:${entry.sourceId}:${index}`}
            >
              <div className="activity-history-marker" aria-hidden="true" />
              <article>
                <div className="activity-history-entry-heading">
                  <span className="activity-kind">{KIND_LABELS[entry.kind]}</span>
                  <time dateTime={entry.occurredAt}>{entry.occurredAt}</time>
                </div>

                <dl className="activity-history-metadata">
                  <div>
                    <dt>Origem</dt>
                    <dd>{entry.sourceType}</dd>
                  </div>
                  <div>
                    <dt>Source ID</dt>
                    <dd>{entry.sourceId}</dd>
                  </div>
                  {entry.subjectId ? (
                    <div>
                      <dt>Alvo</dt>
                      <dd>{entry.subjectId}</dd>
                    </div>
                  ) : null}
                  {entry.correlationId ? (
                    <div>
                      <dt>Correlation</dt>
                      <dd>{entry.correlationId}</dd>
                    </div>
                  ) : null}
                </dl>

                {entry.reason ? <p className="activity-reason">{entry.reason}</p> : null}
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
