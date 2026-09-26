import { useCallback, useEffect, useMemo, useState } from 'react';
import { HubMenuTrigger } from '../../components/HubNavigation';
import {
  getAdminRewardCatalog,
  type AdminRewardCatalogRelease,
} from '../../player-api/playerPortalAdminRewardCatalogClient';
import { usePlayerPortalAdmin } from '../../player-api/usePlayerPortalAdmin';
import { runAdminRepairOperation } from './adminRepairOperationWorkflow';
import './admin-page.css';
import './admin-content.css';

type ResourceKind =
  | 'SPECIES'
  | 'MOVE'
  | 'ITEM'
  | 'AREA'
  | 'ENCOUNTER_TABLE'
  | 'REWARD'
  | 'EFFECT';
type DraftAction = 'CREATE' | 'REPLACE' | 'DEACTIVATE';

const RESOURCE_KINDS: Array<{ value: ResourceKind; label: string }> = [
  { value: 'SPECIES', label: 'Espécie' },
  { value: 'MOVE', label: 'Golpe' },
  { value: 'ITEM', label: 'Item' },
  { value: 'AREA', label: 'Área' },
  { value: 'ENCOUNTER_TABLE', label: 'Tabela de encontro' },
  { value: 'REWARD', label: 'Recompensa' },
  { value: 'EFFECT', label: 'Efeito' },
];

const CREATE_TEMPLATES: Record<ResourceKind, Record<string, unknown>> = {
  SPECIES: { slug: 'nova-especie', nationalDex: 1, displayName: 'Nova espécie', catchRate: null, baseExp: null, data: {} },
  MOVE: { slug: 'novo-golpe', displayName: 'Novo golpe', typeId: '', category: 'STATUS', power: null, accuracy: 100, priority: 0, maxPp: 10, effectKey: null, effectConfig: {}, flags: { makesContact: false } },
  ITEM: { slug: 'novo-item', displayName: 'Novo item', itemKind: 'GENERAL', effectKey: null, effectConfig: {} },
  AREA: { regionId: '', slug: 'nova-area', displayName: 'Nova área', data: {} },
  ENCOUNTER_TABLE: { areaId: '', slug: 'nova-tabela', conditions: {}, entries: [] },
  REWARD: { slug: 'nova-recompensa', displayName: 'Nova recompensa', program: { schemaVersion: 1, grants: [] } },
  EFFECT: { slug: 'novo-efeito', scope: 'POKEMON', stackingPolicy: 'REPLACE', durationModel: 'PERSISTENT', rules: { schemaVersion: 1, operations: [] } },
};

const REPLACE_TEMPLATES: Record<ResourceKind, Record<string, unknown>> = {
  SPECIES: { displayName: 'Espécie', catchRate: null, baseExp: null, data: {} },
  MOVE: { displayName: 'Golpe', typeId: '', category: 'STATUS', power: null, accuracy: 100, priority: 0, maxPp: 10, effectKey: null, effectConfig: {}, flags: { makesContact: false } },
  ITEM: { displayName: 'Item', itemKind: 'GENERAL', effectKey: null, effectConfig: {} },
  AREA: { displayName: 'Área', data: {} },
  ENCOUNTER_TABLE: { conditions: {}, entries: [] },
  REWARD: { displayName: 'Recompensa', program: { schemaVersion: 1, grants: [] } },
  EFFECT: { scope: 'POKEMON', stackingPolicy: 'REPLACE', durationModel: 'PERSISTENT', rules: { schemaVersion: 1, operations: [] } },
};

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

function prettyTemplate(action: DraftAction, kind: ResourceKind) {
  const source = action === 'CREATE' ? CREATE_TEMPLATES[kind] : REPLACE_TEMPLATES[kind];
  return JSON.stringify(source, null, 2);
}

export function AdminContentPage() {
  const admin = usePlayerPortalAdmin();
  const capabilities = admin.status === 'admin' ? admin.admin.capabilities : [];
  const canSee =
    capabilities.includes('content.draft.edit') ||
    capabilities.includes('content.validate') ||
    capabilities.includes('content.publish');

  const [releases, setReleases] = useState<AdminRewardCatalogRelease[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reason, setReason] = useState('');
  const [lifecycleState, setLifecycleState] = useState<'idle' | 'busy' | 'success' | 'error' | 'approval'>('idle');
  const [lifecycleMessage, setLifecycleMessage] = useState('');

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [draftAction, setDraftAction] = useState<DraftAction>('CREATE');
  const [resourceKind, setResourceKind] = useState<ResourceKind>('SPECIES');
  const [resourceId, setResourceId] = useState('');
  const [resourceJson, setResourceJson] = useState(prettyTemplate('CREATE', 'SPECIES'));
  const [draftReason, setDraftReason] = useState('');
  const [draftState, setDraftState] = useState<'idle' | 'busy' | 'success' | 'error' | 'approval'>('idle');
  const [draftMessage, setDraftMessage] = useState('');

  const selected = useMemo(
    () => releases.find((release) => release.releaseId === selectedId) ?? releases[0],
    [releases, selectedId],
  );

  const reload = useCallback(async () => {
    setLoadState('loading');
    try {
      const result = await getAdminRewardCatalog();
      if (result.status !== 'ok') {
        setLoadState('error');
        return;
      }
      setReleases(result.releases);
      setSelectedId((current) =>
        result.releases.some((entry) => entry.releaseId === current)
          ? current
          : (result.releases[0]?.releaseId ?? ''),
      );
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    if (!canSee) return;
    void reload();
  }, [canSee, reload]);

  if (admin.status === 'loading') {
    return (
      <main className="admin-page">
        <header className="admin-topbar">
          <div><small>POKÉMON BEYOND</small><strong>CONTEÚDO</strong></div>
          <HubMenuTrigger />
        </header>
        <section className="admin-loading">CARREGANDO CONTEÚDO…</section>
      </main>
    );
  }
  if (!canSee) return <HiddenAdminRoute />;

  const runLifecycle = async (operationType: 'content.release.validate' | 'content.release.publish') => {
    if (!selected) return;
    if (!reason.trim()) {
      setLifecycleState('error');
      setLifecycleMessage('Informe o motivo da operação.');
      return;
    }
    setLifecycleState('busy');
    setLifecycleMessage('');
    try {
      const result = await runAdminRepairOperation({
        requestId: crypto.randomUUID(),
        operationType,
        input: { releaseId: selected.releaseId },
        reason: reason.trim(),
        expectedRevision: selected.revision,
      });
      if (result.status === 'applied') {
        setLifecycleState('success');
        setLifecycleMessage(
          operationType.endsWith('.validate')
            ? 'Release validado.'
            : 'Release publicado.',
        );
        setReason('');
        await reload();
      } else if (result.status === 'awaiting-approval') {
        setLifecycleState('approval');
        setLifecycleMessage('A publicação está aguardando aprovação de outro administrador.');
      } else if (result.status === 'denied') {
        setLifecycleState('error');
        setLifecycleMessage('Sua sessão não possui autorização para esta operação.');
      } else {
        setLifecycleState('error');
        setLifecycleMessage(`Operação rejeitada: ${result.code}`);
      }
    } catch {
      setLifecycleState('error');
      setLifecycleMessage('Falha de rede ao operar o release.');
    }
  };

  const switchDraftAction = (action: DraftAction) => {
    setDraftAction(action);
    setDraftMessage('');
    setDraftState('idle');
    if (action !== 'DEACTIVATE') setResourceJson(prettyTemplate(action, resourceKind));
  };
  const switchKind = (kind: ResourceKind) => {
    setResourceKind(kind);
    setDraftMessage('');
    setDraftState('idle');
    if (draftAction !== 'DEACTIVATE') setResourceJson(prettyTemplate(draftAction, kind));
  };

  const runDraft = async () => {
    if (!selected || selected.status !== 'DRAFT') {
      setDraftState('error');
      setDraftMessage('Edição só é permitida em release DRAFT.');
      return;
    }
    if (!draftReason.trim()) {
      setDraftState('error');
      setDraftMessage('Informe o motivo da alteração.');
      return;
    }
    if (draftAction !== 'CREATE' && !/^[0-9a-f-]{36}$/i.test(resourceId.trim())) {
      setDraftState('error');
      setDraftMessage('Selecione/informe um ID de recurso válido.');
      return;
    }

    let body: Record<string, unknown> = {};
    if (draftAction !== 'DEACTIVATE') {
      try {
        const parsed = JSON.parse(resourceJson) as unknown;
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
        body = parsed as Record<string, unknown>;
      } catch {
        setDraftState('error');
        setDraftMessage('Os campos avançados não formam um objeto JSON válido.');
        return;
      }
    }

    const operationType =
      draftAction === 'CREATE'
        ? 'content.draft.create'
        : draftAction === 'REPLACE'
          ? 'content.draft.replace'
          : 'content.draft.deactivate';
    const input =
      draftAction === 'CREATE'
        ? { releaseId: selected.releaseId, resource: { kind: resourceKind, ...body } }
        : draftAction === 'REPLACE'
          ? { releaseId: selected.releaseId, resourceId: resourceId.trim(), resource: { kind: resourceKind, ...body } }
          : { releaseId: selected.releaseId, resourceKind, resourceId: resourceId.trim() };

    setDraftState('busy');
    setDraftMessage('');
    try {
      const result = await runAdminRepairOperation({
        requestId: crypto.randomUUID(),
        operationType,
        input,
        reason: draftReason.trim(),
        expectedRevision: selected.revision,
      });
      if (result.status === 'applied') {
        setDraftState('success');
        setDraftMessage('Alteração de conteúdo aplicada e auditada.');
        setDraftReason('');
        await reload();
      } else if (result.status === 'awaiting-approval') {
        setDraftState('approval');
        setDraftMessage('A alteração aguarda aprovação.');
      } else if (result.status === 'denied') {
        setDraftState('error');
        setDraftMessage('Sua sessão não possui autorização para editar conteúdo.');
      } else {
        setDraftState('error');
        setDraftMessage(`Alteração rejeitada: ${result.code}`);
      }
    } catch {
      setDraftState('error');
      setDraftMessage('Falha de rede ao editar conteúdo.');
    }
  };

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div><small>CENTRAL ADM</small><strong>CONTEÚDO</strong></div>
        <HubMenuTrigger />
      </header>

      <section className="admin-shell admin-content-shell">
        <div className="admin-breadcrumb">
          <a href="/admin">CENTRAL ADM</a><span>›</span><strong>CONTEÚDO</strong>
        </div>

        <header className="admin-player-heading">
          <div>
            <span className="admin-kicker">CATÁLOGO DO RPG</span>
            <h1>Conteúdo</h1>
            <p>Revise o release antes de validar ou publicar. Edição avançada fica separada abaixo.</p>
          </div>
        </header>

        {loadState === 'error' ? (
          <div className="admin-player-empty is-error">
            <strong>NÃO FOI POSSÍVEL CARREGAR OS RELEASES</strong>
          </div>
        ) : null}

        <section className="admin-content-releases">
          {releases.map((release) => (
            <button
              type="button"
              key={release.releaseId}
              className={selected?.releaseId === release.releaseId ? 'is-selected' : ''}
              onClick={() => {
                setSelectedId(release.releaseId);
                setLifecycleMessage('');
                setDraftMessage('');
              }}
            >
              <span>RELEASE {release.releaseNo}</span>
              <strong>{release.name}</strong>
              <small>
                {release.status}
                {release.active ? ' · ATIVO NO RPG' : ''}
                {' · '}rev. {release.revision}
              </small>
            </button>
          ))}
        </section>

        {selected ? (
          <section className="admin-content-lifecycle">
            <header>
              <div>
                <span>RELEASE SELECIONADO</span>
                <strong>{selected.name}</strong>
                <small>{selected.status} · revisão {selected.revision}</small>
              </div>
              {selected.active ? <em>ATIVO</em> : null}
            </header>

            <textarea
              value={reason}
              maxLength={2000}
              placeholder="Motivo administrativo"
              onChange={(event) => setReason(event.target.value)}
            />
            <div className="admin-operation-actions">
              {selected.status === 'DRAFT' && capabilities.includes('content.validate') ? (
                <button
                  type="button"
                  disabled={lifecycleState === 'busy'}
                  onClick={() => void runLifecycle('content.release.validate')}
                >
                  VALIDAR RELEASE
                </button>
              ) : null}
              {selected.status === 'VALIDATED' && capabilities.includes('content.publish') ? (
                <button
                  type="button"
                  disabled={lifecycleState === 'busy'}
                  onClick={() => void runLifecycle('content.release.publish')}
                >
                  PUBLICAR RELEASE
                </button>
              ) : null}
            </div>
            {lifecycleMessage ? (
              <p className={`admin-adjustment-feedback is-${lifecycleState}`}>{lifecycleMessage}</p>
            ) : null}
          </section>
        ) : null}

        <section className="admin-content-advanced">
          <button type="button" className="admin-content-advanced-toggle" onClick={() => setAdvancedOpen((value) => !value)}>
            <span>EDIÇÃO AVANÇADA DO DRAFT</span>
            <strong>{advancedOpen ? 'FECHAR' : 'ABRIR'}</strong>
          </button>

          {advancedOpen && selected ? (
            <div className="admin-content-advanced-body">
              {selected.status !== 'DRAFT' ? (
                <p className="admin-muted">Somente releases DRAFT podem ser editados.</p>
              ) : (
                <>
                  <nav>
                    {(['CREATE', 'REPLACE', 'DEACTIVATE'] as DraftAction[]).map((action) => (
                      <button
                        type="button"
                        key={action}
                        className={draftAction === action ? 'is-active' : ''}
                        onClick={() => switchDraftAction(action)}
                      >
                        {action === 'CREATE' ? 'CRIAR' : action === 'REPLACE' ? 'EDITAR' : 'DESATIVAR'}
                      </button>
                    ))}
                  </nav>

                  <div className="admin-operation-fields">
                    <label>
                      <span>TIPO DE CONTEÚDO</span>
                      <select value={resourceKind} onChange={(event) => switchKind(event.target.value as ResourceKind)}>
                        {RESOURCE_KINDS.map((kind) => (
                          <option key={kind.value} value={kind.value}>{kind.label}</option>
                        ))}
                      </select>
                    </label>

                    {draftAction !== 'CREATE' ? (
                      <label>
                        <span>ID DO RECURSO EXISTENTE</span>
                        <input value={resourceId} onChange={(event) => setResourceId(event.target.value.trim())} />
                      </label>
                    ) : null}

                    {draftAction !== 'DEACTIVATE' ? (
                      <label className="is-reason admin-content-json">
                        <span>CAMPOS DO RECURSO</span>
                        <textarea value={resourceJson} spellCheck={false} onChange={(event) => setResourceJson(event.target.value)} />
                      </label>
                    ) : null}

                    <label className="is-reason">
                      <span>MOTIVO</span>
                      <textarea
                        value={draftReason}
                        maxLength={2000}
                        placeholder="Por que este conteúdo está sendo alterado?"
                        onChange={(event) => setDraftReason(event.target.value)}
                      />
                    </label>
                  </div>

                  <button type="button" disabled={draftState === 'busy'} onClick={() => void runDraft()}>
                    {draftState === 'busy'
                      ? 'VALIDANDO…'
                      : draftAction === 'CREATE'
                        ? 'CRIAR NO DRAFT'
                        : draftAction === 'REPLACE'
                          ? 'SALVAR ALTERAÇÃO'
                          : 'DESATIVAR RECURSO'}
                  </button>
                  {draftMessage ? (
                    <p className={`admin-adjustment-feedback is-${draftState}`}>{draftMessage}</p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
