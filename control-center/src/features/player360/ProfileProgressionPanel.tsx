import type { Player360Overview } from '../../lib/api/admin-api';

function textValue(value: string | null): string {
  return value === null || value.length === 0 ? 'Não registrado' : value;
}

function utcTimestamp(value: string | null): string {
  if (value === null) return 'Não registrado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date)} UTC`;
}

function Detail({ label, value, code = false }: { label: string; value: string; code?: boolean }) {
  return (
    <div className="player-detail-row">
      <dt>{label}</dt>
      <dd>{code ? <code>{value}</code> : value}</dd>
    </div>
  );
}

export function ProfileProgressionPanel({ player }: { readonly player: Player360Overview }) {
  const unlocks = player.progression.unlocks;
  const activeUnlocks = unlocks.filter((unlock) => unlock.status === 'ACTIVE').length;

  return (
    <section className="profile-progression-panel" aria-labelledby="profile-progression-title">
      <div className="profile-progression-heading">
        <div>
          <span className="panel-kicker">PERFIL &amp; PROGRESSÃO</span>
          <h3 id="profile-progression-title">Estado humano e mecânico do treinador.</h3>
          <p>
            Dados autoritativos do Player 360. Revisões e origens ficam visíveis para diagnóstico;
            nenhuma alteração é executada nesta aba.
          </p>
        </div>
        <span className="muted-badge">READ MODEL</span>
      </div>

      <div className="profile-progression-grid">
        <article className="player-detail-card">
          <div className="player-detail-card-heading">
            <span>PERFIL</span>
            <small>REV {textValue(player.profile.revision)}</small>
          </div>
          <dl>
            <Detail label="Treinador" value={textValue(player.profile.trainerName)} />
            <Detail label="Status" value={player.status} />
            <Detail label="Localidade" value={textValue(player.profile.locale)} />
            <Detail
              label="Região de origem"
              value={textValue(player.profile.originRegionId)}
              code
            />
            <Detail label="Criado" value={utcTimestamp(player.createdAt)} />
            <Detail label="Atualizado" value={utcTimestamp(player.updatedAt)} />
            <Detail label="Player revision" value={player.playerRevision} code />
          </dl>
        </article>

        <article className="player-detail-card">
          <div className="player-detail-card-heading">
            <span>ONBOARDING</span>
            <small>REV {textValue(player.onboarding.revision)}</small>
          </div>
          <dl>
            <Detail label="Estado" value={textValue(player.onboarding.state)} />
            <Detail label="Concluído em" value={utcTimestamp(player.onboarding.completedAt)} />
            <Detail
              label="Content release"
              value={textValue(player.onboarding.contentReleaseId)}
              code
            />
            <Detail label="Ruleset" value={textValue(player.onboarding.rulesetId)} code />
          </dl>
        </article>

        <article className="player-detail-card progression-summary-card">
          <div className="player-detail-card-heading">
            <span>PROGRESSÃO</span>
            <small>REV {player.progression.revision}</small>
          </div>
          <div className="progression-primary">
            <strong>Nível {player.progression.level}</strong>
            <span>{player.progression.insigniaPoints} pontos de Insígnia</span>
          </div>
          <div className="progression-secondary">
            <span>{activeUnlocks} unlock(s) ativo(s)</span>
            <span>{unlocks.length - activeUnlocks} revogado(s)</span>
          </div>
        </article>
      </div>

      <article className="player-unlocks-card">
        <div className="player-unlocks-heading">
          <div>
            <span className="panel-kicker">UNLOCKS</span>
            <strong>Permissões e marcos derivados da progressão.</strong>
          </div>
          <span className="muted-badge">{unlocks.length} REGISTRADO(S)</span>
        </div>

        {unlocks.length === 0 ? (
          <div className="player-unlocks-empty">
            <strong>Nenhum unlock registrado para este jogador.</strong>
            <span>Isso é um estado válido; a interface não inventa progressão ausente.</span>
          </div>
        ) : (
          <div className="player-unlocks-list">
            {unlocks.map((unlock) => (
              <div className="player-unlock-row" key={`${unlock.key}:${unlock.revision}`}>
                <div className="unlock-identity">
                  <span
                    className={`unlock-status ${unlock.status === 'ACTIVE' ? 'is-active' : 'is-revoked'}`}
                  >
                    {unlock.status}
                  </span>
                  <strong>{unlock.key}</strong>
                  <code>REV {unlock.revision}</code>
                </div>
                <div className="unlock-source">
                  <small>ORIGEM</small>
                  <strong>{unlock.sourceType}</strong>
                  <code>{unlock.sourceId}</code>
                </div>
                <div className="unlock-time">
                  <small>LIBERADO</small>
                  <time dateTime={unlock.unlockedAt}>{utcTimestamp(unlock.unlockedAt)}</time>
                  {unlock.revokedAt ? (
                    <time dateTime={unlock.revokedAt}>
                      Revogado {utcTimestamp(unlock.revokedAt)}
                    </time>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
