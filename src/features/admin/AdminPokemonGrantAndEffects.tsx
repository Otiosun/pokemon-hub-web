import { useEffect, useMemo, useState } from 'react';
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

type PlacementKind = 'TEAM' | 'BOX';
type PokemonGender = '' | 'M' | 'F' | 'GENDERLESS';

type CreateTarget =
  | { placementKind: 'TEAM'; boxNo: null; slotNo: number }
  | { placementKind: 'BOX'; boxNo: number; slotNo: number };

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

function humanizeSlug(value: string) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function suggestedPlacement(pokemon: readonly AdminPlayerPokemon[]): CreateTarget {
  const occupiedTeam = new Set(
    pokemon
      .filter((entry) => entry.status === 'ACTIVE' && entry.placement?.kind === 'TEAM')
      .map((entry) => entry.placement?.slotNo),
  );
  for (let slotNo = 1; slotNo <= 6; slotNo += 1) {
    if (!occupiedTeam.has(slotNo)) return { placementKind: 'TEAM', boxNo: null, slotNo };
  }

  const occupiedBoxOne = new Set(
    pokemon
      .filter(
        (entry) =>
          entry.status === 'ACTIVE' &&
          entry.placement?.kind === 'BOX' &&
          entry.placement.boxNo === 1,
      )
      .map((entry) => entry.placement?.slotNo),
  );
  let slotNo = 1;
  while (occupiedBoxOne.has(slotNo)) slotNo += 1;
  return { placementKind: 'BOX', boxNo: 1, slotNo };
}

function placementOccupied(
  pokemon: readonly AdminPlayerPokemon[],
  target: CreateTarget,
): boolean {
  return pokemon.some((entry) => {
    if (entry.status !== 'ACTIVE' || entry.placement?.kind !== target.placementKind) return false;
    if (target.placementKind === 'TEAM') return entry.placement.slotNo === target.slotNo;
    return entry.placement.boxNo === target.boxNo && entry.placement.slotNo === target.slotNo;
  });
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

  const initialPlacement = useMemo(() => suggestedPlacement(pokemon), [pokemon]);
  const [formId, setFormId] = useState('');
  const [level, setLevel] = useState('5');
  const [nickname, setNickname] = useState('');
  const [shiny, setShiny] = useState(false);
  const [gender, setGender] = useState<PokemonGender>('');
  const [natureId, setNatureId] = useState('');
  const [abilityId, setAbilityId] = useState('');
  const [placementKind, setPlacementKind] = useState<PlacementKind>(
    initialPlacement.placementKind,
  );
  const [boxNo, setBoxNo] = useState(
    initialPlacement.placementKind === 'BOX' ? String(initialPlacement.boxNo) : '1',
  );
  const [slotNo, setSlotNo] = useState(String(initialPlacement.slotNo));
  const [createReason, setCreateReason] = useState('');
  const [createStage, setCreateStage] = useState<'edit' | 'review'>('edit');
  const [createState, setCreateState] = useState<Feedback>({ kind: 'idle', text: '' });

  const selectedForm = forms.find((entry) => entry.formId === formId) ?? forms[0];
  const formAbilities = useMemo(() => {
    if (!selectedForm) return [];
    const allowed = new Set(selectedForm.abilityIds);
    return abilities.filter((entry) => allowed.has(entry.abilityId));
  }, [abilities, selectedForm]);

  const activePokemon = useMemo(
    () => pokemon.filter((entry) => entry.status === 'ACTIVE'),
    [pokemon],
  );
  const occupiedTeamSlots = useMemo(
    () =>
      new Set(
        activePokemon
          .filter((entry) => entry.placement?.kind === 'TEAM')
          .map((entry) => entry.placement?.slotNo),
      ),
    [activePokemon],
  );
  const [pokemonId, setPokemonId] = useState(activePokemon[0]?.id ?? '');
  const selectedPokemon =
    activePokemon.find((entry) => entry.id === pokemonId) ?? activePokemon[0];
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
        setCatalogError(false);
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
    if (abilityId && !formAbilities.some((entry) => entry.abilityId === abilityId)) {
      setAbilityId('');
    }
  }, [abilityId, formAbilities]);

  useEffect(() => {
    if (!selectedPokemon && activePokemon[0]) setPokemonId(activePokemon[0].id);
  }, [activePokemon, selectedPokemon]);

  useEffect(() => {
    setRemoveEffectId(pokemonEffects[0]?.id ?? '');
  }, [pokemonEffects]);

  useEffect(() => {
    const parsedSlot = Number(slotNo);
    const parsedBox = Number(boxNo);
    const currentTarget: CreateTarget | null =
      placementKind === 'TEAM' && Number.isInteger(parsedSlot) && parsedSlot >= 1 && parsedSlot <= 6
        ? { placementKind: 'TEAM', boxNo: null, slotNo: parsedSlot }
        : placementKind === 'BOX' &&
            Number.isInteger(parsedBox) &&
            parsedBox >= 1 &&
            Number.isInteger(parsedSlot) &&
            parsedSlot >= 1
          ? { placementKind: 'BOX', boxNo: parsedBox, slotNo: parsedSlot }
          : null;
    if (currentTarget !== null && !placementOccupied(activePokemon, currentTarget)) return;

    const next = suggestedPlacement(activePokemon);
    setPlacementKind(next.placementKind);
    setBoxNo(next.placementKind === 'BOX' ? String(next.boxNo) : '1');
    setSlotNo(String(next.slotNo));
  }, [activePokemon, boxNo, placementKind, slotNo]);

  if (!canCreate && !canEffects) return null;

  const parseCreateTarget = (): CreateTarget | null => {
    const parsedSlot = Number(slotNo);
    if (!Number.isInteger(parsedSlot) || parsedSlot < 1) return null;
    if (placementKind === 'TEAM') {
      if (parsedSlot > 6) return null;
      return { placementKind: 'TEAM', boxNo: null, slotNo: parsedSlot };
    }
    const parsedBox = Number(boxNo);
    if (
      !Number.isInteger(parsedBox) ||
      parsedBox < 1 ||
      parsedBox > 10_000 ||
      parsedSlot > 1_000_000
    ) {
      return null;
    }
    return { placementKind: 'BOX', boxNo: parsedBox, slotNo: parsedSlot };
  };

  const validateCreate = () => {
    const parsedLevel = Number(level);
    if (!formId) {
      setCreateState({ kind: 'error', text: 'Escolha o Pokémon.' });
      return null;
    }
    if (!Number.isInteger(parsedLevel) || parsedLevel < 1 || parsedLevel > 100) {
      setCreateState({ kind: 'error', text: 'O nível deve estar entre 1 e 100.' });
      return null;
    }
    const target = parseCreateTarget();
    if (target === null) {
      setCreateState({ kind: 'error', text: 'Escolha um destino e slot válidos.' });
      return null;
    }
    if (placementOccupied(activePokemon, target)) {
      setCreateState({ kind: 'error', text: 'Esse slot já está ocupado.' });
      return null;
    }
    if (abilityId && !formAbilities.some((entry) => entry.abilityId === abilityId)) {
      setCreateState({ kind: 'error', text: 'Escolha uma habilidade válida para essa forma.' });
      return null;
    }
    if (natureId && !natures.some((entry) => entry.natureId === natureId)) {
      setCreateState({ kind: 'error', text: 'Escolha uma natureza válida.' });
      return null;
    }
    if (!createReason.trim()) {
      setCreateState({ kind: 'error', text: 'Informe o motivo da entrega.' });
      return null;
    }
    return { parsedLevel, target };
  };

  const reviewPokemon = () => {
    if (validateCreate() === null) return;
    setCreateState({ kind: 'idle', text: '' });
    setCreateStage('review');
  };

  const grantPokemon = async () => {
    const validated = validateCreate();
    if (validated === null) {
      setCreateStage('edit');
      return;
    }

    setCreateState({ kind: 'busy', text: 'CONFIRMANDO ENTREGA…' });
    try {
      const result = await runAdminPokemonOperation({
        requestId: crypto.randomUUID(),
        operationType: 'pokemon.create',
        input: {
          playerId,
          formId,
          level: validated.parsedLevel,
          nickname: nickname.trim() || null,
          shiny,
          gender: gender || null,
          natureId: natureId || null,
          abilityId: abilityId || null,
          target: validated.target,
        },
        reason: createReason.trim(),
      });
      const feedback = resultMessage(result, 'Pokémon entregue e registrado na auditoria.');
      setCreateState(feedback);
      if (feedback.kind === 'success') {
        setNickname('');
        setShiny(false);
        setGender('');
        setNatureId('');
        setAbilityId('');
        setCreateReason('');
        setCreateStage('edit');
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

  const selectedAbility = abilities.find((entry) => entry.abilityId === abilityId);
  const selectedNature = natures.find((entry) => entry.natureId === natureId);
  const reviewTarget = parseCreateTarget();

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
          <header>
            <strong>DAR POKÉMON</strong>
            <span>{forms.length} formas disponíveis</span>
          </header>

          {createStage === 'review' && selectedForm && reviewTarget ? (
            <div className="admin-operation-review">
              <strong>REVISE A ENTREGA</strong>
              <dl>
                <div>
                  <dt>Pokémon</dt>
                  <dd>
                    #{String(selectedForm.nationalDex).padStart(3, '0')} · {selectedForm.displayName}
                    {selectedForm.formSlug === 'default' ? '' : ` · ${selectedForm.formSlug}`}
                  </dd>
                </div>
                <div><dt>Nível</dt><dd>{level}</dd></div>
                <div><dt>Nickname</dt><dd>{nickname.trim() || 'Sem nickname'}</dd></div>
                <div><dt>Shiny</dt><dd>{shiny ? 'Sim' : 'Não'}</dd></div>
                <div>
                  <dt>Gênero</dt>
                  <dd>
                    {gender === 'M'
                      ? 'Masculino'
                      : gender === 'F'
                        ? 'Feminino'
                        : gender === 'GENDERLESS'
                          ? 'Sem gênero'
                          : 'Automático / não definido'}
                  </dd>
                </div>
                <div>
                  <dt>Nature</dt>
                  <dd>{selectedNature ? humanizeSlug(selectedNature.slug) : 'Automática'}</dd>
                </div>
                <div>
                  <dt>Ability</dt>
                  <dd>{selectedAbility ? humanizeSlug(selectedAbility.slug) : 'Automática'}</dd>
                </div>
                <div>
                  <dt>Destino</dt>
                  <dd>
                    {reviewTarget.placementKind === 'TEAM'
                      ? `Time · slot ${reviewTarget.slotNo}`
                      : `Box ${reviewTarget.boxNo} · slot ${reviewTarget.slotNo}`}
                  </dd>
                </div>
                <div><dt>Motivo</dt><dd>{createReason.trim()}</dd></div>
              </dl>
              <div className="admin-operation-actions">
                <button
                  type="button"
                  disabled={createState.kind === 'busy'}
                  onClick={() => {
                    setCreateStage('edit');
                    setCreateState({ kind: 'idle', text: '' });
                  }}
                >
                  VOLTAR
                </button>
                <button
                  type="button"
                  disabled={createState.kind === 'busy'}
                  onClick={() => void grantPokemon()}
                >
                  {createState.kind === 'busy' ? createState.text : 'CONFIRMAR E DAR'}
                </button>
              </div>
            </div>
          ) : (
            <>
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
                  <select value={shiny ? 'yes' : 'no'} onChange={(event) => setShiny(event.target.value === 'yes')}>
                    <option value="no">Não</option>
                    <option value="yes">Sim</option>
                  </select>
                </label>
                <label>
                  <span>GÊNERO</span>
                  <select value={gender} onChange={(event) => setGender(event.target.value as PokemonGender)}>
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
                        {humanizeSlug(nature.slug)}
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
                        {humanizeSlug(ability.slug)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>DESTINO</span>
                  <select
                    value={placementKind}
                    onChange={(event) => {
                      const nextKind = event.target.value as PlacementKind;
                      setPlacementKind(nextKind);
                      if (nextKind === 'TEAM') {
                        const next = suggestedPlacement(activePokemon);
                        if (next.placementKind === 'TEAM') setSlotNo(String(next.slotNo));
                      }
                    }}
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
                  {placementKind === 'TEAM' ? (
                    <select value={slotNo} onChange={(event) => setSlotNo(event.target.value)}>
                      {[1, 2, 3, 4, 5, 6].map((slot) => (
                        <option key={slot} value={slot} disabled={occupiedTeamSlots.has(slot)}>
                          Slot {slot}{occupiedTeamSlots.has(slot) ? ' · ocupado' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      inputMode="numeric"
                      value={slotNo}
                      onChange={(event) => setSlotNo(event.target.value.replace(/\D/g, ''))}
                    />
                  )}
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
                onClick={reviewPokemon}
              >
                REVISAR ENTREGA
              </button>
            </>
          )}

          {createState.text && createState.kind !== 'busy' ? (
            <p className={`admin-adjustment-feedback is-${createState.kind}`}>
              {createState.text}
            </p>
          ) : null}
        </div>
      ) : null}

      {canEffects && activePokemon.length ? (
        <div className="admin-operation-block">
          <header>
            <strong>EFEITOS DO POKÉMON</strong>
            <span>aplicar ou remover</span>
          </header>
          <div className="admin-operation-fields">
            <label>
              <span>POKÉMON</span>
              <select
                value={selectedPokemon?.id ?? ''}
                onChange={(event) => setPokemonId(event.target.value)}
              >
                {activePokemon.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    #{String(entry.nationalDex).padStart(3, '0')} ·{' '}
                    {entry.nickname ?? humanizeSlug(entry.speciesSlug)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>APLICAR EFEITO</span>
              <select value={effectId} onChange={(event) => setEffectId(event.target.value)}>
                {effectCatalog.map((effect) => (
                  <option key={effect.effectId} value={effect.effectId}>
                    {humanizeSlug(effect.slug)}
                  </option>
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
                    <option key={effect.id} value={effect.id}>
                      {humanizeSlug(effect.effectSlug)}
                    </option>
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
            <button
              type="button"
              disabled={!effectCatalog.length || effectState.kind === 'busy'}
              onClick={() => void applyEffect()}
            >
              APLICAR EFEITO
            </button>
            <button
              type="button"
              className="is-danger"
              disabled={!pokemonEffects.length || effectState.kind === 'busy'}
              onClick={() => void removeEffect()}
            >
              REMOVER EFEITO
            </button>
          </div>
          {effectState.text && effectState.kind !== 'busy' ? (
            <p className={`admin-adjustment-feedback is-${effectState.kind}`}>
              {effectState.text}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
