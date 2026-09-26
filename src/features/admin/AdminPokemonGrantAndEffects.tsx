import { useEffect, useMemo, useState } from 'react';
import {
  getAdminRewardCatalog,
  type AdminRewardCatalogEffect,
  type AdminRewardCatalogForm,
} from '../../player-api/playerPortalAdminRewardCatalogClient';
import type {
  AdminPlayer360,
  AdminPlayerPokemon,
} from '../../player-api/playerPortalAdminPlayersClient';
import { runAdminPokemonOperation } from './adminPokemonOperationWorkflow';

type Props = {
  playerId: string;
  capabilities: readonly string[];
  pokemon: AdminPlayerPokemon[];
  effects: AdminPlayer360['effects'];
  onApplied: () => void;
};

type Feedback =
  | { kind: 'idle'; text: '' }
  | { kind: 'busy'; text: string }
  | { kind: 'success' | 'error' | 'approval'; text: string };

function resultMessage(
  result: Awaited<ReturnType<typeof runAdminPokemonOperation>>,
  successText: string,
): Feedback {
  if (result.status === 'applied') return { kind: 'success', text: successText };
  if (result.status === 'awaiting-approval') {
    return { kind: 'approval', text: 'A operação aguarda aprovação de outro administrador.' };
  }
  if (result.status === 'denied') {
    return { kind: 'error', text: 'Sua sessão não possui autorização para esta operação.' };
  }
  return { kind: 'error', text: `Operação rejeitada: ${result.code}` };
}

export function AdminPokemonGrantAndEffects({
  playerId,
  capabilities,
  pokemon,
  effects,
  onApplied,
}: Props) {
  const canCreate = capabilities.includes('pokemon.create');
  const canEffects = capabilities.includes('pokemon.edit.mechanics');
  const [forms, setForms] = useState<AdminRewardCatalogForm[]>([]);
  const [effectCatalog, setEffectCatalog] = useState<AdminRewardCatalogEffect[]>([]);
  const [catalogError, setCatalogError] = useState(false);

  const [formId, setFormId] = useState('');
  const [level, setLevel] = useState('5');
  const [createReason, setCreateReason] = useState('');
  const [createState, setCreateState] = useState<Feedback>({ kind: 'idle', text: '' });

  const activePokemon = useMemo(() => pokemon.filter((entry) => entry.status === 'ACTIVE'), [pokemon]);
  const [pokemonId, setPokemonId] = useState(activePokemon[0]?.id ?? '');
  const selectedPokemon = activePokemon.find((entry) => entry.id === pokemonId) ?? activePokemon[0];
  const pokemonEffects = useMemo(
    () => effects.filter((effect) => effect.pokemonInstanceId === selectedPokemon?.id),
    [effects, selectedPokemon?.id],
  );
  const [effectId, setEffectId] = useState('');
  const [removeEffectId, setRemoveEffectId] = useState('');
  const [effectReason, setEffectReason] = useState('');
  const [effectState, setEffectState] = useState<Feedback>({ kind: 'idle', text: '' });

  useEffect(() => {
    if (!canCreate && !canEffects) return;
    let active = true;
    void getAdminRewardCatalog()
      .then((result) => {
        if (!active) return;
        if (result.status !== 'ok') {
          setCatalogError(true);
          return;
        }
        const availableForms = result.forms;
        const pokemonEffectsOnly = result.effects.filter((effect) => effect.scope === 'POKEMON');
        setForms(availableForms);
        setEffectCatalog(pokemonEffectsOnly);
        setFormId((current) => current || availableForms[0]?.formId || '');
        setEffectId((current) => current || pokemonEffectsOnly[0]?.effectId || '');
      })
      .catch(() => {
        if (active) setCatalogError(true);
      });
    return () => {
      active = false;
    };
  }, [canCreate, canEffects]);

  useEffect(() => {
    if (!selectedPokemon && activePokemon[0]) setPokemonId(activePokemon[0].id);
  }, [activePokemon, selectedPokemon]);

  useEffect(() => {
    setRemoveEffectId(pokemonEffects[0]?.id ?? '');
  }, [pokemonEffects]);

  if (!canCreate && !canEffects) return null;

  const grantPokemon = async () => {
    const parsedLevel = Number(level);
    if (!formId) {
      setCreateState({ kind: 'error', text: 'Escolha o Pokémon.' });
      return;
    }
    if (!Number.isInteger(parsedLevel) || parsedLevel < 1 || parsedLevel > 100) {
      setCreateState({ kind: 'error', text: 'O nível deve estar entre 1 e 100.' });
      return;
    }
    if (!createReason.trim()) {
      setCreateState({ kind: 'error', text: 'Informe o motivo da entrega.' });
      return;
    }

    setCreateState({ kind: 'busy', text: 'PREPARANDO ENTREGA…' });
    try {
      const result = await runAdminPokemonOperation({
        requestId: crypto.randomUUID(),
        operationType: 'pokemon.create',
        input: { playerId, formId, level: parsedLevel },
        reason: createReason.trim(),
      });
      const feedback = resultMessage(result, 'Pokémon entregue e registrado na auditoria.');
      setCreateState(feedback);
      if (feedback.kind === 'success') {
        setCreateReason('');
        onApplied();
      }
    } catch {
      setCreateState({ kind: 'error', text: 'Falha de rede ao entregar o Pokémon.' });
    }
  };

  const applyEffect = async () => {
    if (!selectedPokemon || !effectId) {
      setEffectState({ kind: 'error', text: 'Escolha um Pokémon e um efeito.' });
      return;
    }
    if (!effectReason.trim()) {
      setEffectState({ kind: 'error', text: 'Informe o motivo da alteração.' });
      return;
    }
    setEffectState({ kind: 'busy', text: 'APLICANDO EFEITO…' });
    try {
      const result = await runAdminPokemonOperation({
        requestId: crypto.randomUUID(),
        operationType: 'pokemon.effect.apply',
        input: { playerId, pokemonInstanceId: selectedPokemon.id, effectId },
        reason: effectReason.trim(),
        expectedRevision: selectedPokemon.revision,
      });
      const feedback = resultMessage(result, 'Efeito aplicado e registrado na auditoria.');
      setEffectState(feedback);
      if (feedback.kind === 'success') {
        setEffectReason('');
        onApplied();
      }
    } catch {
      setEffectState({ kind: 'error', text: 'Falha de rede ao aplicar o efeito.' });
    }
  };

  const removeEffect = async () => {
    if (!selectedPokemon || !removeEffectId) {
      setEffectState({ kind: 'error', text: 'Este Pokémon não possui efeito ativo selecionado.' });
      return;
    }
    if (!effectReason.trim()) {
      setEffectState({ kind: 'error', text: 'Informe o motivo da alteração.' });
      return;
    }
    setEffectState({ kind: 'busy', text: 'REMOVENDO EFEITO…' });
    try {
      const result = await runAdminPokemonOperation({
        requestId: crypto.randomUUID(),
        operationType: 'pokemon.effect.remove',
        input: {
          playerId,
          pokemonInstanceId: selectedPokemon.id,
          activeEffectId: removeEffectId,
        },
        reason: effectReason.trim(),
        expectedRevision: selectedPokemon.revision,
      });
      const feedback = resultMessage(result, 'Efeito removido e registrado na auditoria.');
      setEffectState(feedback);
      if (feedback.kind === 'success') {
        setEffectReason('');
        onApplied();
      }
    } catch {
      setEffectState({ kind: 'error', text: 'Falha de rede ao remover o efeito.' });
    }
  };

  return (
    <section className="admin-player-adjustments admin-pokemon-grant-effects">
      <header>
        <div>
          <span>POKÉMON</span>
          <strong>ENTREGA E EFEITOS</strong>
        </div>
        <small>OPERAÇÕES AUDITADAS</small>
      </header>

      {catalogError ? (
        <p className="admin-adjustment-feedback is-error">
          Não foi possível carregar o catálogo Pokémon da Central.
        </p>
      ) : null}

      {canCreate ? (
        <div className="admin-operation-block">
          <header><strong>DAR POKÉMON</strong><span>{forms.length} formas disponíveis</span></header>
          <div className="admin-operation-fields">
            <label>
              <span>ESPÉCIE / FORMA</span>
              <select value={formId} onChange={(event) => setFormId(event.target.value)}>
                {forms.map((form) => (
                  <option key={form.formId} value={form.formId}>
                    #{String(form.nationalDex).padStart(3, '0')} · {form.displayName}
                    {form.formSlug === 'default' ? '' : ` · ${form.formSlug}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>NÍVEL</span>
              <input
                inputMode="numeric"
                value={level}
                onChange={(event) => setLevel(event.target.value.replace(/\D/g, ''))}
              />
            </label>
            <label className="is-reason">
              <span>MOTIVO</span>
              <textarea
                value={createReason}
                onChange={(event) => setCreateReason(event.target.value)}
                placeholder="Ex.: recompensa de evento"
                maxLength={2000}
              />
            </label>
          </div>
          <button
            type="button"
            disabled={createState.kind === 'busy' || !forms.length}
            onClick={() => void grantPokemon()}
          >
            {createState.kind === 'busy' ? createState.text : 'DAR POKÉMON'}
          </button>
          {createState.text && createState.kind !== 'busy' ? (
            <p className={`admin-adjustment-feedback is-${createState.kind}`}>{createState.text}</p>
          ) : null}
        </div>
      ) : null}

      {canEffects && activePokemon.length ? (
        <div className="admin-operation-block">
          <header><strong>EFEITOS DO POKÉMON</strong><span>aplicar ou remover</span></header>
          <div className="admin-operation-fields">
            <label>
              <span>POKÉMON</span>
              <select value={selectedPokemon?.id ?? ''} onChange={(event) => setPokemonId(event.target.value)}>
                {activePokemon.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    #{String(entry.nationalDex).padStart(3, '0')} · {entry.nickname ?? entry.speciesSlug}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>APLICAR EFEITO</span>
              <select value={effectId} onChange={(event) => setEffectId(event.target.value)}>
                {effectCatalog.map((effect) => (
                  <option key={effect.effectId} value={effect.effectId}>{effect.slug}</option>
                ))}
              </select>
            </label>
            <label>
              <span>REMOVER EFEITO ATIVO</span>
              <select
                value={removeEffectId}
                onChange={(event) => setRemoveEffectId(event.target.value)}
                disabled={!pokemonEffects.length}
              >
                {pokemonEffects.length ? (
                  pokemonEffects.map((effect) => (
                    <option key={effect.id} value={effect.id}>{effect.effectSlug}</option>
                  ))
                ) : (
                  <option value="">Nenhum efeito ativo</option>
                )}
              </select>
            </label>
            <label className="is-reason">
              <span>MOTIVO</span>
              <textarea
                value={effectReason}
                onChange={(event) => setEffectReason(event.target.value)}
                placeholder="Explique a alteração"
                maxLength={2000}
              />
            </label>
          </div>
          <div className="admin-operation-actions">
            <button type="button" disabled={!effectCatalog.length || effectState.kind === 'busy'} onClick={() => void applyEffect()}>
              APLICAR EFEITO
            </button>
            <button type="button" className="is-danger" disabled={!pokemonEffects.length || effectState.kind === 'busy'} onClick={() => void removeEffect()}>
              REMOVER EFEITO
            </button>
          </div>
          {effectState.text && effectState.kind !== 'busy' ? (
            <p className={`admin-adjustment-feedback is-${effectState.kind}`}>{effectState.text}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
