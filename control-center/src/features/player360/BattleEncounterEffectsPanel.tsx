import type { Player360Overview } from '../../lib/api/admin-api';
import {
  type Player360BattleContextView,
  parsePlayer360BattleContext,
} from './player360-battle';

function humanizeSlug(value: string): string {
  return value
    .split(/[-_:]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function ContextCard({
  kicker,
  title,
  rows,
}: {
  readonly kicker: string;
  readonly title: string;
  readonly rows: readonly { readonly label: string; readonly value: string }[];
}) {
  return (
    <article className="battle-context-card">
      <span className="panel-kicker">{kicker}</span>
      <strong>{title}</strong>
      <dl>
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

export function BattleEncounterEffectsPanel({ player }: { readonly player: Player360Overview }) {
  let context: Player360BattleContextView;
  try {
    context = parsePlayer360BattleContext(player);
  } catch {
    return (
      <section className="battle-context-panel" role="alert">
        <span className="panel-kicker">COMBATE &amp; ENCOUNTER</span>
        <h3>Dados operacionais incompatíveis com o contrato atual.</h3>
        <p className="battle-context-empty">
          A Central bloqueou esta leitura para não apresentar batalha, encounter ou efeitos sem validação.
        </p>
      </section>
    );
  }

  return (
    <section className="battle-context-panel" aria-labelledby="battle-context-title">
      <div className="battle-context-heading">
        <div>
          <span className="panel-kicker">COMBATE &amp; ENCOUNTER</span>
          <h3 id="battle-context-title">Estado ao vivo antes de qualquer intervenção.</h3>
          <p>Batalha, encounter e efeitos são exibidos somente para diagnóstico nesta etapa.</p>
        </div>
        <span className="muted-badge">READ-ONLY</span>
      </div>

      <div className="battle-context-grid">
        {context.activeBattle ? (
          <ContextCard
            kicker="BATALHA ATIVA"
            title={context.activeBattle.id}
            rows={[
              { label: 'Status', value: context.activeBattle.status },
              { label: 'Tipo', value: context.activeBattle.battleType },
              { label: 'Turno', value: `TURNO ${context.activeBattle.turnNumber}` },
              { label: 'Versão', value: context.activeBattle.version },
              { label: 'Encounter', value: context.activeBattle.encounterId ?? '—' },
              { label: 'Ruleset', value: context.activeBattle.rulesetId },
              { label: 'Release', value: context.activeBattle.contentReleaseId },
              { label: 'Atualizada em', value: context.activeBattle.updatedAt },
            ]}
          />
        ) : (
          <p className="battle-context-empty">Sem batalha ativa.</p>
        )}

        {context.activeEncounter ? (
          <ContextCard
            kicker="ENCOUNTER ATIVO"
            title={context.activeEncounter.id}
            rows={[
              { label: 'Status', value: context.activeEncounter.status },
              { label: 'Área', value: context.activeEncounter.areaId },
              { label: 'Ruleset', value: context.activeEncounter.rulesetId },
              { label: 'Release', value: context.activeEncounter.contentReleaseId },
              { label: 'Criado em', value: context.activeEncounter.createdAt },
              { label: 'Atualizado em', value: context.activeEncounter.updatedAt },
            ]}
          />
        ) : (
          <p className="battle-context-empty">Sem encounter ativo.</p>
        )}
      </div>

      <section className="effects-section" aria-labelledby="active-effects-title">
        <div className="effects-heading">
          <div>
            <span className="panel-kicker">EFEITOS ATIVOS</span>
            <h4 id="active-effects-title">Efeitos vinculados ao contexto atual</h4>
          </div>
          <span className="muted-badge">{context.effects.length}</span>
        </div>

        {context.effects.length === 0 ? (
          <p className="battle-context-empty">Sem efeitos ativos.</p>
        ) : (
          <div className="effects-list">
            {context.effects.map((effect) => (
              <article className="effect-row" key={effect.id}>
                <div>
                  <strong>{humanizeSlug(effect.effectSlug)}</strong>
                  <small>{effect.effectId}</small>
                </div>
                <dl>
                  <div>
                    <dt>Jogador</dt>
                    <dd>{effect.playerId ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Pokémon</dt>
                    <dd>{effect.pokemonInstanceId ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Release</dt>
                    <dd>{effect.contentReleaseId}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
