import type { Player360Overview } from '../../lib/api/admin-api';
import { contextualPlayerActions } from './player360-actions';

function policyLabel(
  requiresExpectedRevision: boolean,
  requiresConfirmation: boolean,
): readonly string[] {
  const labels = ['MOTIVO OBRIGATÓRIO'];
  if (requiresExpectedRevision) labels.push('REVISÃO OBRIGATÓRIA');
  if (requiresConfirmation) labels.push('CONFIRMAÇÃO OBRIGATÓRIA');
  return labels;
}

export function PlayerActionRail({
  capabilities,
  player,
}: {
  readonly capabilities: ReadonlySet<string>;
  readonly player: Player360Overview;
}) {
  const actions = contextualPlayerActions(capabilities, player);

  return (
    <aside className="player-action-rail" aria-labelledby="player-action-rail-title">
      <div className="player-action-rail-heading">
        <div>
          <span className="panel-kicker">AÇÕES CONTEXTUAIS</span>
          <h3 id="player-action-rail-title">Somente o que esta sessão pode preparar.</h3>
          <p>
            As opções abaixo vêm das capabilities efetivas e do estado atual do jogador. Nenhuma
            operação é aplicada por esta superfície.
          </p>
        </div>
        <span className="muted-badge">EXECUÇÃO AINDA BLOQUEADA</span>
      </div>

      {actions.length === 0 ? (
        <div className="player-action-rail-empty">
          <strong>Nenhuma ação administrativa disponível neste contexto.</strong>
          <span>A Central não amplia privilégios nem exibe ferramentas sem authority efetiva.</span>
        </div>
      ) : (
        <div className="player-action-list">
          {actions.map((action) => (
            <article className="player-action-card" key={action.operationType}>
              <div className="player-action-card-heading">
                <div>
                  <strong>{action.label}</strong>
                  <p>{action.description}</p>
                </div>
                <span className={`risk-badge is-r${action.riskTier}`}>R{action.riskTier}</span>
              </div>

              <div className="player-action-policy" aria-label={`Política de ${action.label}`}>
                {policyLabel(action.requiresExpectedRevision, action.requiresConfirmation).map(
                  (label) => (
                    <span key={label}>{label}</span>
                  ),
                )}
              </div>

              <button className="player-action-locked" disabled type="button">
                Abrir fluxo seguro
              </button>
            </article>
          ))}
        </div>
      )}
    </aside>
  );
}
