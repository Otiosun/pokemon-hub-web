import { useMemo, useState } from 'react';
import { HubModuleHeader } from '../../components/HubModuleHeader';
import type { PlayerPortalBrowserSessionState } from '../../player-api/playerPortalBrowserSession';
import {
  movePlayerPortalPokemon,
  type PlayerPortalRosterPlacement,
} from '../../player-api/playerPortalRosterClient';
import { OwnedPokemonImage } from '../../visual-assets/PokemonPreviewImage';
import { TypeBadge } from '../../visual-assets/TypeBadge';
import {
  createOwnedPokemonView,
  type OwnedPokemonView,
} from '../collection/ownedPokemonView';
import { useOwnedPokemonCollection } from '../collection/useOwnedPokemonCollection';
import { typeAccent } from '../pokemon-detail/fieldDexSpecies';
import './team-page.css';

type TeamPageProps = {
  playerPortalSession: PlayerPortalBrowserSessionState;
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function pokemonPortrait(pokemon: OwnedPokemonView) {
  return pokemon.dex !== null ? (
    <OwnedPokemonImage
      dex={pokemon.dex}
      assetRole="portrait"
      shiny={pokemon.shiny}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      fallbackLabel="?"
    />
  ) : (
    <strong aria-hidden="true">?</strong>
  );
}

function firstFreeBoxTarget(pokemon: readonly OwnedPokemonView[]): PlayerPortalRosterPlacement {
  const occupied = new Set(
    pokemon
      .filter((item) => item.boxNo !== null && item.storageSlot !== null)
      .map((item) => `${item.boxNo}:${item.storageSlot}`),
  );
  const maxBox = Math.max(1, ...pokemon.map((item) => item.boxNo ?? 0));

  for (let boxNo = 1; boxNo <= maxBox + 1; boxNo += 1) {
    for (let slotNo = 1; slotNo <= 30; slotNo += 1) {
      if (!occupied.has(`${boxNo}:${slotNo}`)) {
        return { placementKind: 'BOX', boxNo, slotNo };
      }
    }
  }

  return { placementKind: 'BOX', boxNo: maxBox + 1, slotNo: 1 };
}

export function TeamPage({ playerPortalSession }: TeamPageProps) {
  const collection = useOwnedPokemonCollection();
  const [editing, setEditing] = useState(false);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [organizingStatus, setOrganizingStatus] = useState<'idle' | 'saving'>('idle');
  const [organizingMessage, setOrganizingMessage] = useState<string | null>(null);
  const [boxQuery, setBoxQuery] = useState('');

  const pokemon = useMemo(
    () =>
      collection.status === 'authenticated'
        ? createOwnedPokemonView(collection.pokemon)
        : [],
    [collection],
  );
  const team = useMemo(
    () =>
      pokemon
        .filter((item) => item.teamSlot !== null)
        .sort((left, right) => (left.teamSlot ?? 99) - (right.teamSlot ?? 99)),
    [pokemon],
  );
  const storage = useMemo(
    () =>
      pokemon
        .filter((item) => item.teamSlot === null)
        .sort(
          (left, right) =>
            (left.boxNo ?? 999) - (right.boxNo ?? 999) ||
            (left.storageSlot ?? 999) - (right.storageSlot ?? 999),
        ),
    [pokemon],
  );
  const visibleStorage = useMemo(() => {
    const needle = normalize(boxQuery);
    if (!needle) return storage;
    return storage.filter(
      (item) =>
        normalize(item.nickname).includes(needle) ||
        normalize(item.species).includes(needle),
    );
  }, [boxQuery, storage]);
  const teamBySlot = useMemo(
    () => new Map(team.map((item) => [item.teamSlot, item] as const)),
    [team],
  );
  const representedTypes = [...new Set(team.flatMap((item) => item.types))];
  const freeSlots = Math.max(0, 6 - team.length);
  const source =
    sourceId === null ? null : pokemon.find((item) => item.instanceId === sourceId) ?? null;

  const sessionCopy =
    collection.status === 'authenticated'
      ? team.length > 0
        ? 'A formação abaixo é o próprio Time ativo. Abra um parceiro normalmente ou entre em edição para reorganizar e substituir membros.'
        : 'Nenhum Pokémon está equipado no time ativo deste treinador.'
      : collection.status === 'loading' || playerPortalSession.status === 'loading'
        ? 'Sincronizando a formação oficial do treinador.'
        : 'O time oficial não está disponível nesta sessão.';

  const selectSource = (candidate: OwnedPokemonView) => {
    if (!editing || organizingStatus === 'saving') return;
    if (candidate.instanceId === sourceId) {
      setSourceId(null);
      setOrganizingMessage('Seleção cancelada.');
      return;
    }
    setSourceId(candidate.instanceId);
    setOrganizingMessage(
      candidate.teamSlot !== null
        ? `${candidate.nickname} selecionado. Toque em outro slot para mover ou escolha um Pokémon da Box para substituir.`
        : `${candidate.nickname} selecionado na Box. Toque no slot do Time onde ele deve entrar.`,
    );
  };

  const persistMove = async ({
    pokemonInstanceId,
    target,
    successMessage,
  }: {
    pokemonInstanceId: string;
    target: PlayerPortalRosterPlacement;
    successMessage: string;
  }) => {
    if (organizingStatus === 'saving') return;
    setOrganizingStatus('saving');
    setOrganizingMessage('Salvando formação oficial…');

    try {
      const result = await movePlayerPortalPokemon({ pokemonInstanceId, target });
      if (result.status === 'unauthenticated') {
        setOrganizingMessage('Sua sessão expirou. Abra o Hub novamente pelo acesso oficial.');
        return;
      }
      collection.replacePokemon(result.pokemon);
      setSourceId(null);
      setOrganizingMessage(successMessage);
    } catch {
      setOrganizingMessage('Não foi possível alterar a formação agora.');
    } finally {
      setOrganizingStatus('idle');
    }
  };

  const chooseTeamSlot = async (slotNo: number) => {
    const occupant = teamBySlot.get(slotNo) ?? null;

    if (!source) {
      if (occupant) selectSource(occupant);
      return;
    }

    if (source.teamSlot === slotNo) {
      setSourceId(null);
      setOrganizingMessage('Seleção cancelada.');
      return;
    }

    await persistMove({
      pokemonInstanceId: source.instanceId,
      target: { placementKind: 'TEAM', boxNo: null, slotNo },
      successMessage: occupant
        ? `${source.nickname} e ${occupant.nickname} trocaram de posição.`
        : `${source.nickname} entrou no slot ${slotNo}.`,
    });
  };

  const chooseStoragePokemon = async (candidate: OwnedPokemonView) => {
    if (!source) {
      selectSource(candidate);
      return;
    }

    if (source.teamSlot === null) {
      selectSource(candidate);
      return;
    }

    const targetSlot = source.teamSlot;
    await persistMove({
      pokemonInstanceId: candidate.instanceId,
      target: { placementKind: 'TEAM', boxNo: null, slotNo: targetSlot },
      successMessage: `${candidate.nickname} entrou no Time no lugar de ${source.nickname}.`,
    });
  };

  const sendSelectedToBox = async () => {
    if (!source || source.teamSlot === null) return;
    if (team.length <= 1) {
      setOrganizingMessage('O Time precisa manter pelo menos um Pokémon ativo.');
      return;
    }
    const target = firstFreeBoxTarget(pokemon);
    await persistMove({
      pokemonInstanceId: source.instanceId,
      target,
      successMessage: `${source.nickname} foi enviado para Box ${target.boxNo} · slot ${target.slotNo}.`,
    });
  };

  const toggleEditing = () => {
    setEditing((current) => !current);
    setSourceId(null);
    setOrganizingMessage(null);
    setBoxQuery('');
  };

  return (
    <main className="team-page">
      <HubModuleHeader module="team" metaLabel="FORMAÇÃO" metaValue={`${team.length} / 6`} />

      <div className="team-page-content">
        <header className="team-header">
          <div>
            <span className="team-kicker">
              {collection.status === 'authenticated'
                ? 'FORMAÇÃO ATIVA'
                : collection.status === 'loading'
                  ? 'CARREGANDO TIME'
                  : 'TIME INDISPONÍVEL'}
            </span>
            <h1>Meu Time</h1>
            <p>{sessionCopy}</p>
          </div>
          <div className="team-header-actions">
            <button
              type="button"
              className={editing ? 'is-active' : undefined}
              disabled={collection.status !== 'authenticated'}
              onClick={toggleEditing}
            >
              {editing ? 'CONCLUIR EDIÇÃO' : 'EDITAR FORMAÇÃO'}
            </button>
            <div className="team-readout">
              <strong>{team.length}/6</strong>
              <span>SLOTS OCUPADOS</span>
            </div>
          </div>
        </header>

        {editing ? (
          <section className="team-edit-status" aria-live="polite">
            <div>
              <span>EDIÇÃO DA FORMAÇÃO</span>
              <strong>
                {source ? `${source.nickname} selecionado` : 'Selecione um Pokémon'}
              </strong>
              <small>
                {source && source.teamSlot !== null
                  ? 'Toque em outro slot para reorganizar, ou escolha um Pokémon da Box para fazer a substituição.'
                  : source
                    ? 'Toque em um slot do Time para colocar este Pokémon na formação.'
                    : 'Os próprios cards abaixo são os controles. Não há uma segunda cópia do Time.'}
              </small>
            </div>
            {source && source.teamSlot !== null ? (
              <button
                type="button"
                disabled={organizingStatus === 'saving' || team.length <= 1}
                title={team.length <= 1 ? 'O Time precisa manter pelo menos um Pokémon ativo' : undefined}
                onClick={() => void sendSelectedToBox()}
              >
                ENVIAR PARA BOX
              </button>
            ) : null}
          </section>
        ) : null}

        <section className="team-workbench" aria-label="Time ativo">
          <div className="team-grid">
            {[1, 2, 3, 4, 5, 6].map((slotNo) => {
              const member = teamBySlot.get(slotNo) ?? null;
              const selected = member?.instanceId === sourceId;
              const slotBody = member ? (
                <>
                  <div className="team-slot-visual">
                    {pokemonPortrait(member)}
                  </div>
                  <div className="team-slot-main">
                    <div className="team-slot-heading">
                      <div>
                        <strong>{member.nickname}</strong>
                        <span>
                          {member.dex !== null
                            ? `#${String(member.dex).padStart(3, '0')}`
                            : 'CATÁLOGO INDISPONÍVEL'}
                        </span>
                      </div>
                      <em>NV. {member.level}</em>
                    </div>
                    <div className="team-slot-types">
                      {member.types.map((type) => (
                        <TypeBadge key={type} type={type} accent={typeAccent(type)} compact />
                      ))}
                    </div>
                    <div className="team-slot-status">
                      <span><i aria-hidden="true" /> ATIVO</span>
                      <strong>HP {member.currentHp}</strong>
                    </div>
                  </div>
                </>
              ) : (
                <div className="team-slot-empty">
                  <strong>VAZIO</strong>
                  <span>
                    {editing && source?.teamSlot === null
                      ? 'TOQUE PARA ADICIONAR'
                      : 'SEM POKÉMON'}
                  </span>
                </div>
              );

              return (
                <article
                  className={`team-slot${selected ? ' is-selected' : ''}${member ? '' : ' is-empty'}`}
                  key={slotNo}
                >
                  <div className="team-slot-number">
                    <span>SLOT</span>
                    <strong>{String(slotNo).padStart(2, '0')}</strong>
                  </div>

                  {editing ? (
                    <button
                      type="button"
                      className="team-slot-open is-editing"
                      disabled={
                        organizingStatus === 'saving' ||
                        (!source && member === null)
                      }
                      aria-pressed={selected}
                      onClick={() => void chooseTeamSlot(slotNo)}
                    >
                      {slotBody}
                    </button>
                  ) : member ? (
                    <a
                      className="team-slot-open"
                      href={`/pokemon/${member.instanceId}`}
                      aria-label={`Abrir registro de ${member.nickname}`}
                    >
                      {slotBody}
                    </a>
                  ) : (
                    <div className="team-slot-open">{slotBody}</div>
                  )}
                </article>
              );
            })}
          </div>

          <aside className="team-analysis" aria-label="Leitura do conjunto">
            <div className="team-analysis-head">
              <span>LEITURA DO CONJUNTO</span>
              <strong>Composição</strong>
            </div>
            <p>
              Leitura direta da formação oficial, com ocupação dos slots e tipos realmente
              registrados no time.
            </p>
            <div className="team-type-cloud">
              {representedTypes.map((type) => (
                <TypeBadge key={type} type={type} accent={typeAccent(type)} />
              ))}
            </div>
            <dl className="team-analysis-facts">
              <div><dt>MEMBROS</dt><dd>{team.length}</dd></div>
              <div><dt>TIPOS PRESENTES</dt><dd>{representedTypes.length}</dd></div>
              <div><dt>SLOTS LIVRES</dt><dd>{freeSlots}</dd></div>
            </dl>
          </aside>
        </section>

        {editing ? (
          <section className="team-box-picker" aria-label="Pokémon disponíveis na Box">
            <header>
              <div>
                <span>BOX</span>
                <strong>
                  {source && source.teamSlot !== null
                    ? `Escolha quem substitui ${source.nickname}`
                    : 'Escolha um Pokémon da Box'}
                </strong>
                <small>
                  {source && source.teamSlot !== null
                    ? 'Tocar em um Pokémon abaixo faz a troca diretamente com o slot selecionado.'
                    : 'Depois de selecionar, toque no slot do Time onde ele deve entrar.'}
                </small>
              </div>
              <label>
                <span>BUSCAR</span>
                <input
                  value={boxQuery}
                  onChange={(event) => setBoxQuery(event.target.value)}
                  placeholder="Nickname ou espécie"
                  inputMode="search"
                />
              </label>
            </header>

            <div className="team-box-grid">
              {visibleStorage.map((candidate) => (
                <button
                  key={candidate.instanceId}
                  type="button"
                  className={candidate.instanceId === sourceId ? 'is-selected' : undefined}
                  disabled={organizingStatus === 'saving'}
                  aria-pressed={candidate.instanceId === sourceId}
                  onClick={() => void chooseStoragePokemon(candidate)}
                >
                  <div className="team-box-portrait">{pokemonPortrait(candidate)}</div>
                  <div>
                    <strong>{candidate.nickname}</strong>
                    <span>{candidate.species} · NV. {candidate.level}</span>
                    <small>{candidate.box} · SLOT {candidate.storageSlot ?? '—'}</small>
                  </div>
                </button>
              ))}
            </div>

            {visibleStorage.length === 0 ? (
              <div className="team-box-empty">Nenhum Pokémon da Box corresponde à busca.</div>
            ) : null}

            {organizingMessage ? <p role="status">{organizingMessage}</p> : null}

            <footer>
              <a href="/pokemon">ABRIR ORGANIZAÇÃO COMPLETA DA BOX →</a>
            </footer>
          </section>
        ) : null}
      </div>
    </main>
  );
}
