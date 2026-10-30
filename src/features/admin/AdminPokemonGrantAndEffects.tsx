import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getAdminRewardCatalog,
  type AdminRewardCatalogAbility,
  type AdminRewardCatalogEffect,
  type AdminRewardCatalogForm,
  type AdminRewardCatalogNature,
} from '../../player-api/playerPortalAdminRewardCatalogClient';
import type {
  AdminPlayer360,
  AdminPlayerPokemon,
} from '../../player-api/playerPortalAdminPlayersClient';
import { runAdminPokemonOperation } from './adminPokemonOperationWorkflow';
import { keepPokemonAdminIntent, type PendingPokemonAdminIntent } from './adminPokemonRetryIntent';

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
  const [abilities, setAbilities] = useState<AdminRewardCatalogAbility[]>([]);
  const [natures, setNatures] = useState<AdminRewardCatalogNature[]>([]);
  const [effectCatalog, setEffectCatalog] = useState<AdminRewardCatalogEffect[]>([]);
  const [catalogError, setCatalogError] = useState(false);

  const [formId, setFormId] = useState('');
  const [level, setLevel] = useState('5');
  const [nickname, setNickname] = useState('');
  const [shiny, setShiny] = useState(false);
  const [gender, setGender] = useState('');
  const [natureId, setNatureId] = useState('');
  const [abilityId, setAbilityId] = useState('');
  const [placementKind, setPlacementKind] = useState<'TEAM' | 'BOX'>('TEAM');
  const [boxNo, setBoxNo] = useState('1');
  const [slotNo, setSlotNo] = useState('1');
  const [createReason, setCreateReason] = useState('');
  const [createState, setCreateState] = useState<Feedback>({ kind: 'idle', text: '' });

  const selectedForm = forms.find((entry) => entry.formId === formId);
  const formAbilities = useMemo(() => {
    if (!selectedForm) return [];
    return abilities.filter((entry) => selectedForm.abilityIds.includes(entry.abilityId));
  }, [abilities, selectedForm]);
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
  const createIntentRef = useRef<PendingPokemonAdminIntent | null>(null);
  const effectIntentRef = useRef<PendingPokemonAdminIntent | null>(null);
  const previousPlayerIdRef = useRef(playerId);
  useEffect(() => {
    if (previousPlayerIdRef.current === playerId) return;
    previousPlayerIdRef.current = playerId;
    createIntentRef.current = null;
    effectIntentRef.current = null;
  }, [playerId]);

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
        setAbilities(result.abilities);
        setNatures(result.natures);
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
    if (abilityId && !formAbilities.some((entry) => entry.abilityId === abilityId)) {
      setAbilityId('');
    }
  }, [abilityId, formAbilities]);

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
    const parsedSlotNo = Number(slotNo);
    const parsedBoxNo = Number(boxNo);
    if (!Number.isInteger(parsedSlotNo) || parsedSlotNo < 1) {
      setCreateState({ kind: 'error', text: 'Informe um slot válido.' });
      return;
    }
    if (placementKind === 'BOX' && parsedSlotNo > 30) {
      setCreateState({ kind: 'error', text: 'A Box possui slots de 1 a 30.' });
      return;
    }
    if (placementKind === 'TEAM' && parsedSlotNo > 6) {
      setCreateState({ kind: 'error', text: 'O time possui slots de 1 a 6.' });
      return;
    }
    if (placementKind === 'BOX' && (!Number.isInteger(parsedBoxNo) || parsedBoxNo < 1)) {
      setCreateState({ kind: 'error', text: 'Informe uma Box válida.' });
      return;
    }
    const occupied = activePokemon.some((entry) => {
      if (entry.placement?.kind !== placementKind || entry.placement.slotNo !== parsedSlotNo) {
        return false;
      }
      return placementKind === 'TEAM' || entry.placement.boxNo === parsedBoxNo;
    });
    if (occupied) {
      setCreateState({ kind: 'error', text: 'Esse slot já está ocupado.' });
      return;
    }
    if (!createReason.trim()) {
      setCreateState({ kind: 'error', text: 'Informe o motivo da entrega.' });
      return;
    }

    const target =
      placementKind === 'TEAM'
        ? { placementKind: 'TEAM' as const, boxNo: null, slotNo: parsedSlotNo }
        : { placementKind: 'BOX' as const, boxNo: parsedBoxNo, slotNo: parsedSlotNo };

    const form = forms.find((entry) => entry.formId === formId);
    const nature = natures.find((entry) => entry.natureId === natureId);
    const ability = abilities.find((entry) => entry.abilityId === abilityId);
    const destination =
      target.placementKind === 'TEAM'
        ? `Time · slot ${target.slotNo}`
        : `Box ${target.boxNo} · slot ${target.slotNo}`;
    const confirmed = window.confirm(
      [
        'Revisar entrega de Pokémon',
        '',
        `Pokémon: ${form?.displayName ?? 'Selecionado'}`,
        `Nível: ${parsedLevel}`,
        `Nickname: ${nickname.trim() || 'sem nickname'}`,
        `Shiny: ${shiny ? 'sim' : 'não'}`,
        `Gênero: ${gender || 'automático / não definido'}`,
        `Nature: ${nature?.slug ?? 'automática'}`,
        `Ability: ${ability?.slug ?? 'automática'}`,
        `Destino: ${destination}`,
        '',
        `Motivo: ${createReason.trim()}`,
      ].join('\n'),
    );
    if (!confirmed) return;

    const retry = keepPokemonAdminIntent(createIntentRef.current, {
        requestId: crypto.randomUUID(),
        operationType: 'pokemon.create',
        input: {
          playerId,
          formId,
          level: parsedLevel,
          nickname: nickname.trim() || null,
          shiny,
          gender: gender || null,
          natureId: natureId || null,
          abilityId: abilityId || null,
          target,
        },
        reason: createReason.trim(),
    });
    if (retry.status === 'locked') {
      setCreateState({ kind: 'error', text: 'Há uma entrega anterior sem desfecho confirmado. Não altere os dados; recarregue o histórico administrativo antes de abrir outro pedido.' });
      return;
    }
    createIntentRef.current = retry.intent;
    setCreateState({ kind: 'busy', text: 'PREPARANDO ENTREGA…' });
    try {
      const result = await runAdminPokemonOperation(retry.intent.request);
      if (result.status !== 'awaiting-approval') createIntentRef.current = null;
      const feedback = resultMessage(result, 'Pokémon entregue e registrado na auditoria.');
      setCreateState(feedback);
      if (feedback.kind === 'success') {
        setNickname('');
        setShiny(false);
        setGender('');
        setNatureId('');
        setAbilityId('');
        setCreateReason('');
        onApplied();
      }
    } catch {
      setCreateState({ kind: 'error', text: 'Resposta incerta. A entrega pode ter sido aplicada: consulte a auditoria e repita somente com os mesmos dados e identificador.' });
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
    const retry = keepPokemonAdminIntent(effectIntentRef.current, {
      requestId: crypto.randomUUID(),
      operationType: 'pokemon.effect.apply',
      input: { playerId, pokemonInstanceId: selectedPokemon.id, effectId },
      reason: effectReason.trim(),
      expectedRevision: selectedPokemon.revision,
    });
    if (retry.status === 'locked') {
      setEffectState({ kind: 'error', text: 'Uma operação anterior neste painel ainda precisa de reconciliação na auditoria. Não altere seus dados para repetir.' });
      return;
    }
    effectIntentRef.current = retry.intent;
    setEffectState({ kind: 'busy', text: 'APLICANDO EFEITO…' });
    try {
      const result = await runAdminPokemonOperation(retry.intent.request);
      if (result.status !== 'awaiting-approval') effectIntentRef.current = null;
      const feedback = resultMessage(result, 'Efeito aplicado e registrado na auditoria.');
      setEffectState(feedback);
      if (feedback.kind === 'success') {
        setEffectReason('');
        onApplied();
      }
    } catch {
      setEffectState({ kind: 'error', text: 'Resposta incerta ao aplicar efeito. Confira a auditoria; repetir mantém o identificador e os dados originais.' });
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
    const retry = keepPokemonAdminIntent(effectIntentRef.current, {
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
    if (retry.status === 'locked') {
      setEffectState({ kind: 'error', text: 'Outra alteração de efeito está com resultado incerto. Verifique a auditoria antes de modificar os dados ou tentar outra operação.' });
      return;
    }
    effectIntentRef.current = retry.intent;
    setEffectState({ kind: 'busy', text: 'REMOVENDO EFEITO…' });
    try {
      const result = await runAdminPokemonOperation(retry.intent.request);
      if (result.status !== 'awaiting-approval') effectIntentRef.current = null;
      const feedback = resultMessage(result, 'Efeito removido e registrado na auditoria.');
      setEffectState(feedback);
      if (feedback.kind === 'success') {
        setEffectReason('');
        onApplied();
      }
    } catch {
      setEffectState({ kind: 'error', text: 'Resposta incerta ao remover efeito. Confira a auditoria; repetir mantém o identificador e os dados originais.' });
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
            <label>
              <span>NICKNAME · OPCIONAL</span>
              <input
                value={nickname}
                maxLength={64}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="Sem nickname"
              />
            </label>
            <label>
              <span>SHINY</span>
              <select
                value={shiny ? 'yes' : 'no'}
                onChange={(event) => setShiny(event.target.value === 'yes')}
              >
                <option value="no">Não</option>
                <option value="yes">Sim</option>
              </select>
            </label>
            <label>
              <span>GÊNERO</span>
              <select value={gender} onChange={(event) => setGender(event.target.value)}>
                <option value="">Automático / não definido</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="GENDERLESS">Sem gênero</option>
              </select>
            </label>
            <label>
              <span>NATURE</span>
              <select value={natureId} onChange={(event) => setNatureId(event.target.value)}>
                <option value="">Automática</option>
                {natures.map((nature) => (
                  <option key={nature.natureId} value={nature.natureId}>
                    {nature.slug}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>ABILITY</span>
              <select value={abilityId} onChange={(event) => setAbilityId(event.target.value)}>
                <option value="">Automática</option>
                {formAbilities.map((ability) => (
                  <option key={ability.abilityId} value={ability.abilityId}>
                    {ability.slug}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>DESTINO</span>
              <select
                value={placementKind}
                onChange={(event) => setPlacementKind(event.target.value as 'TEAM' | 'BOX')}
              >
                <option value="TEAM">Time</option>
                <option value="BOX">Box</option>
              </select>
            </label>
            {placementKind === 'BOX' ? (
              <label>
                <span>BOX</span>
                <input
                  inputMode="numeric"
                  value={boxNo}
                  onChange={(event) => setBoxNo(event.target.value.replace(/\D/g, ''))}
                />
              </label>
            ) : null}
            <label>
              <span>SLOT</span>
              <input
                inputMode="numeric"
                value={slotNo}
                onChange={(event) => setSlotNo(event.target.value.replace(/\D/g, ''))}
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
            {createState.kind === 'busy' ? createState.text : 'REVISAR E DAR'}
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
