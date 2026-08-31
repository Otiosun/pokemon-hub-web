import type { Player360Overview } from '../../lib/api/admin-api';
import { contextualPlayerActions, type PlayerContextualAction } from './player360-actions';

function policyLabel(
  requiresExpectedRevision: boolean,
  requiresConfirmation: boolean,
): readonly string[] {
  const labels = ['MOTIVO OBRIGATÓRIO'];
  if (requiresExpectedRevision) labels.push('REVISÃO OBRIGATÓRIA');
  if (requiresConfirmation) labels.push('CONFIRMAÇÃO OBRIGATÓRIA');
  return labels;
}

function prepareButtonLabel(action: PlayerContextualAction): string {
  return action.operationType === 'battle.force_cancel'
    ? 'Preparar cancelamento'
    : 'Preparar ajuste';
}

export function PlayerActionRail({
  capabilities,
  onPrepareAction,
  player,
}: {
  readonly capabilities: ReadonlySet<string>;
  readonly onPrepareAction?: (action: PlayerContextualAction) => void;
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
          {actions.map((action) => {
            const canPrepare =
              (action.operationType === 'battle.force_cancel' ||
                action.operationType === 'progression.trainer.adjust' ||
                action.operationType === 'wallet.adjust') &&
              onPrepareAction !== undefined;

            return (
              <article className="player-action-card" key={action.operationType}>
                <div className="player-action-card-heading">
                  <div>
                    {canPrepare ? <span className="panel-kicker">PREPARAR OPERAÇÃO</span> : null}
                    <strong>{action.label}</strong>
                    <p>{action.description}</p>
                    {canPrepare ? <code>{action.operationType}</code> : null}
                  </div>
                  <span className={`risk-badge is-r${action.riskTier}`}>R{action.riskTier}</span>
                </div>

                <div className="player-action-policy">
                  {policyLabel(action.requiresExpectedRevision, action.requiresConfirmation).map(
                    (label) => (
                      <span key={label}>{label}</span>
                    ),
                  )}
                </div>

                {canPrepare ? (
                  <button
                    className="player-action-prepare secondary-button"
                    onClick={() => onPrepareAction(action)}
                    type="button"
                  >
                    {prepareButtonLabel(action)}
                  </button>
                ) : (
                  <button className="player-action-locked" disabled type="button">
                    Abrir fluxo seguro
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </aside>
  );
}
