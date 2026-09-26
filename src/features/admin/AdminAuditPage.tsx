import { useEffect, useMemo, useState } from 'react';
import { HubMenuTrigger } from '../../components/HubNavigation';
import {
  getAdminAudit,
  type AdminAuditEntry,
  type AdminAuditStatus,
} from '../../player-api/playerPortalAdminAuditClient';
import { usePlayerPortalAdmin } from '../../player-api/usePlayerPortalAdmin';
import './admin-page.css';
import './admin-audit.css';

const OPERATION_LABELS: Record<string, string> = {
  'inventory.adjust': 'Ajuste de item',
  'wallet.adjust': 'Ajuste de dinheiro',
  'progression.adjust': 'Ajuste de progressão',
  'pokedex.seen.grant': 'Registro de Pokémon visto',
  'pokedex.correct': 'Correção de Pokédex',
  'pokemon.create': 'Criação de Pokémon',
  'pokemon.edit.basic': 'Edição básica de Pokémon',
  'pokemon.edit.mechanics': 'Edição mecânica de Pokémon',
  'pokemon.moves.edit': 'Edição de golpes',
  'pokemon.training.edit': 'Edição de treino',
  'pokemon.ability.edit': 'Edição de habilidade',
  'pokemon.archive_remove': 'Arquivamento de Pokémon',
  'battle.correct_state': 'Correção de batalha',
  'battle.force_cancel': 'Cancelamento de batalha',
  'encounter.force_close': 'Encerramento de encontro',
  'content.draft.create': 'Criação de conteúdo no draft',
  'content.draft.replace': 'Edição de conteúdo no draft',
  'content.draft.deactivate': 'Desativação de conteúdo no draft',
  'content.release.validate': 'Validação de release',
  'content.release.publish': 'Publicação de release',
  'admin.role.assign': 'Alteração de função administrativa',
};

const STATUS_LABELS: Record<AdminAuditStatus, string> = {
  DRAFT: 'RASCUNHO',
  VALIDATED: 'VALIDADO',
  SIMULATED: 'SIMULADO',
  PENDING_CONFIRMATION: 'AGUARDANDO CONFIRMAÇÃO',
  PENDING_APPROVAL: 'AGUARDANDO APROVAÇÃO',
  READY: 'PRONTO',
  APPLIED: 'APLICADO',
  REJECTED: 'REJEITADO',
  FAILED: 'FALHOU',
  COMPENSATED: 'REVERTIDO',
};

const TARGET_LABELS: Record<string, string> = {
  PLAYER: 'Jogador',
  POKEMON: 'Pokémon',
  BATTLE: 'Batalha',
  ENCOUNTER: 'Encontro',
  CONTENT_RELEASE: 'Release',
  CONTENT_RESOURCE: 'Conteúdo',
  ADMIN_PRINCIPAL: 'Administrador',
};

const RISK_LABELS = ['Consulta', 'Leve', 'Moderada', 'Sensível', 'Crítica'] as const;

function HiddenAdminRoute() {
  return (
    <main className="admin-page admin-page-hidden">
      <section>
        <span>404</span>
        <strong>ENDEREÇO INDISPONÍVEL</strong>
        <a href="/jornada">VOLTAR À JORNADA</a>
      </section>
    </main>
  );
}

function operationLabel(operationType: string) {
  const known = OPERATION_LABELS[operationType];
  if (known) return known;
  return operationType
    .split(/[._:-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase('pt-BR') + part.slice(1))
    .join(' · ');
}

function targetLabel(targetType: string) {
  return TARGET_LABELS[targetType] ?? targetType.replaceAll('_', ' ').toLocaleLowerCase('pt-BR');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function AdminAuditPage() {
  const admin = usePlayerPortalAdmin();
  const canRead = admin.status === 'admin' && admin.admin.capabilities.includes('audit.read');
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error' | 'forbidden'>('loading');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<AdminAuditStatus | 'ALL'>('ALL');

  useEffect(() => {
    if (admin.status === 'loading') return;
    if (!canRead) {
      setLoadState('forbidden');
      return;
    }
    let active = true;
    setLoadState('loading');
    void getAdminAudit(100)
      .then((result) => {
        if (!active) return;
        if (result.status !== 'ok') {
          setLoadState('forbidden');
          return;
        }
        setEntries(result.entries);
        setLoadState('ready');
      })
      .catch(() => {
        if (active) setLoadState('error');
      });
    return () => {
      active = false;
    };
  }, [admin.status, canRead]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return entries.filter((entry) => {
      if (status !== 'ALL' && entry.status !== status) return false;
      if (!normalized) return true;
      return [
        operationLabel(entry.operationType),
        entry.actorDisplayName,
        entry.reason ?? '',
        targetLabel(entry.targetType),
        STATUS_LABELS[entry.status],
      ].some((value) => value.toLocaleLowerCase('pt-BR').includes(normalized));
    });
  }, [entries, query, status]);

  if (admin.status === 'loading' || loadState === 'loading') {
    return (
      <main className="admin-page">
        <header className="admin-topbar">
          <div><small>CENTRAL ADM</small><strong>AUDITORIA</strong></div>
          <HubMenuTrigger />
        </header>
        <section className="admin-loading">CARREGANDO HISTÓRICO ADMINISTRATIVO…</section>
      </main>
    );
  }

  if (loadState === 'forbidden' || !canRead) return <HiddenAdminRoute />;

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div><small>CENTRAL ADM</small><strong>AUDITORIA</strong></div>
        <HubMenuTrigger />
      </header>

      <section className="admin-shell admin-audit-shell">
        <div className="admin-breadcrumb">
          <a href="/admin">CENTRAL ADM</a><span>›</span><strong>AUDITORIA</strong>
        </div>

        <header className="admin-audit-heading">
          <div>
            <span className="admin-kicker">TRILHA ADMINISTRATIVA</span>
            <h1>Histórico de ações</h1>
            <p>Quem fez, o que fez, quando fez e qual justificativa foi registrada.</p>
          </div>
          <div className="admin-audit-count">
            <span>EXIBINDO</span>
            <strong>{filtered.length}</strong>
            <small>de {entries.length} ações recentes</small>
          </div>
        </header>

        <section className="admin-audit-filters" aria-label="Filtros da auditoria">
          <input
            value={query}
            placeholder="Buscar por ação, administrador ou motivo"
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as AdminAuditStatus | 'ALL')}
          >
            <option value="ALL">Todos os estados</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </section>

        {loadState === 'error' ? (
          <div className="admin-audit-empty is-error">
            <strong>NÃO FOI POSSÍVEL CARREGAR A AUDITORIA</strong>
            <small>Tente abrir a tela novamente.</small>
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-audit-empty">
            <strong>NENHUMA AÇÃO ENCONTRADA</strong>
            <small>Ajuste os filtros acima.</small>
          </div>
        ) : (
          <section className="admin-audit-list" aria-label="Ações administrativas recentes">
            {filtered.map((entry) => (
              <article className="admin-audit-card" key={entry.operationId}>
                <header>
                  <span className={`is-status-${entry.status.toLocaleLowerCase('pt-BR')}`}>
                    {STATUS_LABELS[entry.status]}
                  </span>
                  <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
                </header>
                <div className="admin-audit-main">
                  <div>
                    <strong>{operationLabel(entry.operationType)}</strong>
                    <small>
                      {targetLabel(entry.targetType)} · impacto {RISK_LABELS[entry.riskTier].toLocaleLowerCase('pt-BR')}
                    </small>
                  </div>
                  <div className="admin-audit-actor">
                    <span>RESPONSÁVEL</span>
                    <strong>{entry.actorDisplayName}</strong>
                  </div>
                </div>
                <footer>
                  <span>MOTIVO REGISTRADO</span>
                  <p>{entry.reason?.trim() || 'Sem justificativa obrigatória para esta ação.'}</p>
                </footer>
              </article>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
