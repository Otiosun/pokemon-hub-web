import { useEffect, useMemo, useState } from 'react';
import { HubMenuTrigger } from '../../components/HubNavigation';
import {
  getAdminTeam,
  replaceAdminTeamCapabilities,
  type AdminTeamCapability,
  type AdminTeamPrincipal,
} from '../../player-api/playerPortalAdminTeamClient';
import { usePlayerPortalAdmin } from '../../player-api/usePlayerPortalAdmin';
import './admin-page.css';
import './admin-team.css';

type LoadState = 'loading' | 'ready' | 'error' | 'forbidden';

const CATEGORY_ORDER = [
  'ACESSO',
  'JOGADORES',
  'POKÉMON',
  'ECONOMIA',
  'MUNDO E BATALHA',
  'CONTEÚDO',
  'ADMINISTRAÇÃO',
  'OUTROS',
] as const;

function categoryFor(key: string): (typeof CATEGORY_ORDER)[number] {
  if (key === 'central.view') return 'ACESSO';
  if (
    key.startsWith('player.') ||
    key.startsWith('progression.') ||
    key.startsWith('pokedex.')
  ) return 'JOGADORES';
  if (key.startsWith('pokemon.') || key.startsWith('effect.') || key.startsWith('effects.')) {
    return 'POKÉMON';
  }
  if (
    key.startsWith('wallet.') ||
    key.startsWith('inventory.') ||
    key.startsWith('economy.') ||
    key.startsWith('reward.') ||
    key.startsWith('batch.')
  ) return 'ECONOMIA';
  if (key.startsWith('world.') || key.startsWith('encounter.') || key.startsWith('battle.')) {
    return 'MUNDO E BATALHA';
  }
  if (key.startsWith('content.')) return 'CONTEÚDO';
  if (
    key.startsWith('admin.') ||
    key.startsWith('admin_') ||
    key.startsWith('audit.') ||
    key.startsWith('community.')
  ) return 'ADMINISTRAÇÃO';
  return 'OUTROS';
}

function labelFor(key: string): string {
  const labels: Record<string, string> = {
    'central.view': 'Acessar a Central ADM',
    'player.read': 'Ver jogadores',
    'player.read_sensitive': 'Ver dados sensíveis',
    'player.registration.read': 'Ver fichas em análise',
    'player.registration.approve': 'Aprovar fichas',
    'player.registration.reject': 'Rejeitar fichas',
    'player.registration.request_changes': 'Pedir alterações na ficha',
    'player.registration.reopen': 'Reabrir análise de ficha',
    'player.access.suspend': 'Suspender jogador',
    'player.access.restore': 'Restaurar acesso do jogador',
    'player.location.correct': 'Corrigir localização',
    'progression.adjust': 'Dar/remover progressão',
    'inventory.adjust': 'Dar/remover itens',
    'wallet.adjust': 'Dar/remover dinheiro',
    'pokedex.seen.grant': 'Registrar Pokémon como VISTO',
    'pokedex.correct': 'Corrigir Pokédex',
    'pokemon.create': 'Criar Pokémon',
    'pokemon.roster.manage': 'Mover Pokémon entre Time/Box',
    'pokemon.edit.basic': 'Editar dados básicos de Pokémon',
    'pokemon.edit.mechanics': 'Editar mecânicas de Pokémon',
    'pokemon.moves.edit': 'Editar golpes',
    'pokemon.training.edit': 'Editar treino/valores',
    'pokemon.ability.edit': 'Editar habilidade',
    'pokemon.archive_remove': 'Arquivar/remover Pokémon',
    'encounter.force_close': 'Encerrar encontro à força',
    'battle.force_cancel': 'Cancelar batalha à força',
    'content.publish': 'Publicar conteúdo',
    'content.rollback_release': 'Reverter release de conteúdo',
    'audit.read': 'Ver auditoria',
  };
  return labels[key] ?? key;
}

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

export function AdminTeamPage() {
  const admin = usePlayerPortalAdmin();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [principals, setPrincipals] = useState<AdminTeamPrincipal[]>([]);
  const [catalog, setCatalog] = useState<AdminTeamCapability[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [reason, setReason] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const owner = admin.status === 'admin' && admin.admin.owner;

  useEffect(() => {
    if (admin.status !== 'admin' || !owner) {
      if (admin.status !== 'loading') setLoadState('forbidden');
      return;
    }
    let active = true;
    setLoadState('loading');
    void getAdminTeam()
      .then((result) => {
        if (!active) return;
        if (result.status !== 'ok') {
          setLoadState('forbidden');
          return;
        }
        setPrincipals(result.principals);
        setCatalog(result.capabilityCatalog);
        const firstEditable = result.principals.find((principal) => !principal.owner);
        const first = firstEditable ?? result.principals[0];
        setSelectedId(first?.principalId ?? '');
        setDraft(new Set(first?.capabilities ?? []));
        setLoadState('ready');
      })
      .catch(() => {
        if (active) setLoadState('error');
      });
    return () => {
      active = false;
    };
  }, [admin.status, owner]);

  const selected = principals.find((principal) => principal.principalId === selectedId) ?? null;

  const grouped = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    const map = new Map<string, AdminTeamCapability[]>();
    for (const capability of catalog) {
      const label = labelFor(capability.key);
      if (
        normalized &&
        !capability.key.toLocaleLowerCase('pt-BR').includes(normalized) &&
        !label.toLocaleLowerCase('pt-BR').includes(normalized)
      ) continue;
      const category = categoryFor(capability.key);
      const current = map.get(category) ?? [];
      current.push(capability);
      map.set(category, current);
    }
    return CATEGORY_ORDER.map((category) => ({
      category,
      capabilities: map.get(category) ?? [],
    })).filter((group) => group.capabilities.length > 0);
  }, [catalog, query]);

  if (admin.status === 'loading' || loadState === 'loading') {
    return (
      <main className="admin-page">
        <header className="admin-topbar">
          <div><small>CENTRAL ADM</small><strong>EQUIPE ADMINISTRATIVA</strong></div>
          <HubMenuTrigger />
        </header>
        <section className="admin-loading">CARREGANDO PODERES ADMINISTRATIVOS…</section>
      </main>
    );
  }
  if (loadState === 'forbidden' || admin.status !== 'admin' || !owner) {
    return <HiddenAdminRoute />;
  }

  const selectPrincipal = (principal: AdminTeamPrincipal) => {
    setSelectedId(principal.principalId);
    setDraft(new Set(principal.capabilities));
  };

  const visibleKeys = grouped.flatMap((group) => group.capabilities.map((capability) => capability.key));

  const applyVisible = (enabled: boolean) => {
    if (!selected || selected.owner) return;
    setDraft((current) => {
      const next = new Set(current);
      for (const key of visibleKeys) {
        if (enabled) next.add(key);
        else next.delete(key);
      }
      return next;
    });
    setSaveState('idle');
  };

  const save = async () => {
    if (!selected || selected.owner || !reason.trim()) {
      setSaveState('error');
      setMessage(selected?.owner ? 'Donos são protegidos.' : 'Informe o motivo da alteração.');
      return;
    }
    setSaveState('saving');
    setMessage('');
    try {
      const result = await replaceAdminTeamCapabilities({
        principalId: selected.principalId,
        capabilities: [...draft].sort(),
        reason: reason.trim(),
        expectedRevision: selected.revision,
      });
      if (result.status !== 'ok') {
        setSaveState('error');
        setMessage(
          result.status === 'conflict'
            ? 'As permissões mudaram em outra sessão. Reabra a tela antes de salvar novamente.'
            : result.status === 'rejected'
              ? `Alteração rejeitada: ${result.code}`
              : 'Você não possui autorização para essa alteração.',
        );
        return;
      }
      setPrincipals((current) =>
        current.map((principal) =>
          principal.principalId === result.principal.principalId ? result.principal : principal,
        ),
      );
      setDraft(new Set(result.principal.capabilities));
      setReason('');
      setSaveState('success');
      setMessage('Permissões atualizadas e registradas na auditoria.');
    } catch {
      setSaveState('error');
      setMessage('Falha ao atualizar as permissões.');
    }
  };

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div><small>CENTRAL ADM · DONOS</small><strong>EQUIPE ADMINISTRATIVA</strong></div>
        <HubMenuTrigger />
      </header>

      <section className="admin-shell admin-team-shell">
        <div className="admin-breadcrumb">
          <a href="/admin">CENTRAL ADM</a><span>›</span><strong>EQUIPE ADMINISTRATIVA</strong>
        </div>

        <header className="admin-team-heading">
          <div>
            <span className="admin-kicker">CONTROLE INDIVIDUAL</span>
            <h1>Poderes administrativos</h1>
            <p>Escolha uma pessoa e marque exatamente o que ela pode fazer. Não existem níveis de ADM.</p>
          </div>
          <div className="admin-team-owner-badge">
            <span>GESTÃO</span><strong>SOMENTE DONOS</strong><small>alterações auditadas</small>
          </div>
        </header>

        <div className="admin-team-layout">
          <aside className="admin-team-people">
            <header><span>EQUIPE</span><strong>{principals.length}</strong></header>
            {principals.map((principal) => (
              <button
                key={principal.principalId}
                type="button"
                className={principal.principalId === selectedId ? 'is-active' : ''}
                onClick={() => selectPrincipal(principal)}
              >
                <span><strong>{principal.displayName}</strong><small>{principal.status}</small></span>
                <em>{principal.owner ? 'DONO · PROTEGIDO' : `${principal.capabilities.length} poderes`}</em>
              </button>
            ))}
          </aside>

          <section className="admin-team-editor">
            {selected ? (
              <>
                <header className="admin-team-selected">
                  <div>
                    <span>ADMINISTRADOR</span>
                    <strong>{selected.displayName}</strong>
                  </div>
                  <div>
                    <span>ATIVOS</span>
                    <strong>{selected.owner ? 'TODOS · PROTEGIDO' : draft.size}</strong>
                  </div>
                </header>

                {selected.owner ? (
                  <div className="admin-team-protected">
                    <strong>DONO PROTEGIDO</strong>
                    <p>Os poderes deste dono não podem ser reduzidos ou alterados por esta interface.</p>
                  </div>
                ) : (
                  <>
                    <div className="admin-team-tools">
                      <input
                        value={query}
                        placeholder="Buscar permissão"
                        onChange={(event) => setQuery(event.target.value)}
                      />
                      <button type="button" onClick={() => applyVisible(true)}>MARCAR VISÍVEIS</button>
                      <button type="button" onClick={() => applyVisible(false)}>DESMARCAR VISÍVEIS</button>
                    </div>

                    <div className="admin-team-groups">
                      {grouped.map((group) => (
                        <section key={group.category}>
                          <header>
                            <strong>{group.category}</strong>
                            <span>
                              {group.capabilities.filter((capability) => draft.has(capability.key)).length}/
                              {group.capabilities.length}
                            </span>
                          </header>
                          <div>
                            {group.capabilities.map((capability) => (
                              <label key={capability.key}>
                                <input
                                  type="checkbox"
                                  checked={draft.has(capability.key)}
                                  onChange={(event) => {
                                    setDraft((current) => {
                                      const next = new Set(current);
                                      if (event.target.checked) next.add(capability.key);
                                      else next.delete(capability.key);
                                      return next;
                                    });
                                    setSaveState('idle');
                                  }}
                                />
                                <span>
                                  <strong>{labelFor(capability.key)}</strong>
                                  <small>{capability.key}</small>
                                </span>
                              </label>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>

                    <div className="admin-team-save">
                      <textarea
                        value={reason}
                        maxLength={2000}
                        placeholder="Motivo da alteração de permissões"
                        onChange={(event) => setReason(event.target.value)}
                      />
                      <button type="button" disabled={saveState === 'saving'} onClick={() => void save()}>
                        {saveState === 'saving' ? 'SALVANDO…' : 'SALVAR PODERES'}
                      </button>
                    </div>
                    {message ? (
                      <p className={saveState === 'success' ? 'is-success' : 'is-error'}>{message}</p>
                    ) : null}
                  </>
                )}
              </>
            ) : (
              <div className="admin-team-empty">Nenhum administrador disponível.</div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
