import { useEffect, useMemo, useState } from 'react';
import {
  FIELD_DEX_REVIEW_SPECIES,
  getFieldDexVisual,
  typeAccent,
} from '../pokemon-detail/fieldDexSpecies';
import './pokedex-index.css';
import './pokedex-species.css';

type PokemonPayload = {
  name?: string;
  height?: number;
  weight?: number;
  types?: Array<{ slot?: number; type?: { name?: string } }>;
};

type RecordState = {
  status: 'loading' | 'ready' | 'failed';
  name: string;
  height: string;
  weight: string;
  types: string[];
};

const TOTAL = 386;
const TYPE_LABELS: Record<string, string> = {
  normal: 'Normal',
  fire: 'Fogo',
  water: 'Água',
  electric: 'Elétrico',
  grass: 'Planta',
  ice: 'Gelo',
  fighting: 'Lutador',
  poison: 'Veneno',
  ground: 'Terrestre',
  flying: 'Voador',
  psychic: 'Psíquico',
  bug: 'Inseto',
  rock: 'Pedra',
  ghost: 'Fantasma',
  dragon: 'Dragão',
  dark: 'Sombrio',
  steel: 'Aço',
  fairy: 'Fada',
};

function regionForDex(dex: number) {
  if (dex <= 151) return 'Kanto';
  if (dex <= 251) return 'Johto';
  return 'Hoenn';
}

function formatSpeciesName(value: string) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function translateType(value: string) {
  return TYPE_LABELS[value] ?? formatSpeciesName(value);
}

function formatMetric(value: number | undefined, divisor: number, unit: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${(value / divisor).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unit}`;
}

function readDexReview(dex: number) {
  return FIELD_DEX_REVIEW_SPECIES.find((species) => species.dex === dex);
}

function neighbourHref(dex: number) {
  return `/pokedex/${String(dex).padStart(3, '0')}`;
}

export function PokedexSpeciesPage({ dex }: { dex: number }) {
  const validDex = Number.isInteger(dex) && dex >= 1 && dex <= TOTAL ? dex : 1;
  const review = useMemo(() => readDexReview(validDex), [validDex]);
  const visual = getFieldDexVisual(validDex);
  const [record, setRecord] = useState<RecordState>({
    status: 'loading',
    name: review?.name ?? `Espécie ${String(validDex).padStart(3, '0')}`,
    height: review?.height ?? '—',
    weight: review?.weight ?? '—',
    types: review?.types ?? [],
  });

  useEffect(() => {
    const controller = new AbortController();
    setRecord({
      status: 'loading',
      name: review?.name ?? `Espécie ${String(validDex).padStart(3, '0')}`,
      height: review?.height ?? '—',
      weight: review?.weight ?? '—',
      types: review?.types ?? [],
    });

    async function loadRecord() {
      try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${validDex}`, {
          signal: controller.signal,
          cache: 'force-cache',
        });
        if (!response.ok) throw new Error(`PokéAPI HTTP ${response.status}`);
        const payload = (await response.json()) as PokemonPayload;
        const types = [...(payload.types ?? [])]
          .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
          .map((item) => item.type?.name)
          .filter((value): value is string => Boolean(value))
          .map(translateType);

        setRecord({
          status: 'ready',
          name: payload.name ? formatSpeciesName(payload.name) : review?.name ?? `Espécie ${validDex}`,
          height: formatMetric(payload.height, 10, 'm'),
          weight: formatMetric(payload.weight, 10, 'kg'),
          types: types.length > 0 ? types : review?.types ?? [],
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn(`National Dex record ${validDex} unavailable`, error);
        setRecord((current) => ({ ...current, status: 'failed' }));
      }
    }

    void loadRecord();
    return () => controller.abort();
  }, [review, validDex]);

  const previousDex = validDex > 1 ? validDex - 1 : null;
  const nextDex = validDex < TOTAL ? validDex + 1 : null;
  const region = regionForDex(validDex);
  const description =
    review?.description ??
    'Arquivo-base da espécie. Observações de campo, comportamento e registros do RPG serão incorporados quando disponíveis.';

  return (
    <main className="pokedex-species-page">
      <header className="pokedex-index-header">
        <a className="pokedex-index-brand" href="/pokedex" aria-label="Voltar ao Índice Nacional">
          <span className="pokedex-index-lens" aria-hidden="true" />
          <span>
            <strong>FIELD DEX</strong>
            <small>REGISTRO NACIONAL</small>
          </span>
        </a>
        <div className="pokedex-index-counter">
          <small>NATIONAL</small>
          <strong>{String(validDex).padStart(3, '0')} / 386</strong>
        </div>
      </header>

      <section className="pokedex-species-shell">
        <div className="pokedex-species-stage">
          <div className="pokedex-species-stage-top">
            <span>NATIONAL {String(validDex).padStart(3, '0')} · {region.toUpperCase()}</span>
            <span className={`pokedex-species-sync is-${record.status}`}>
              <i aria-hidden="true" />
              {record.status === 'ready' ? 'ARQUIVO SINCRONIZADO' : record.status === 'failed' ? 'MODO OFFLINE' : 'SINCRONIZANDO'}
            </span>
          </div>

          <img
            className="pokedex-species-artwork"
            src={visual.artworkOfficial}
            alt={`Ilustração de ${record.name}`}
            decoding="async"
            fetchPriority="high"
          />

          <div className="pokedex-species-identity">
            <span className="pokedex-species-mode">ARQUIVO 2D · ESPÉCIE</span>
            <h1>{record.name}</h1>
            <div className="pokedex-species-types">
              {record.types.map((type) => (
                <span key={type} style={{ borderColor: `${typeAccent(type)}70` }}>
                  <i style={{ background: typeAccent(type) }} aria-hidden="true" />
                  {type.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="pokedex-species-data">
          <div className="pokedex-species-data-head">
            <div>
              <span>REGISTRO DA ESPÉCIE</span>
              <strong>{review?.category ?? `Arquivo Nacional #${String(validDex).padStart(3, '0')}`}</strong>
            </div>
            {review && (
              <a className="pokedex-species-3d" href={`/pokemon/${review.routeSlug}`}>
                INSPECIONAR EM 3D
              </a>
            )}
          </div>

          <p className="pokedex-species-description">{description}</p>

          <dl className="pokedex-species-facts">
            <div><dt>REGIÃO</dt><dd>{region}</dd></div>
            <div><dt>TIPO</dt><dd>{record.types.join(' · ') || '—'}</dd></div>
            <div><dt>ALTURA</dt><dd>{record.height}</dd></div>
            <div><dt>PESO</dt><dd>{record.weight}</dd></div>
          </dl>

          <div className="pokedex-species-note">
            <strong>CAMADA DE CAMPO</strong>
            <p>Este registro leve não carrega WebGL. O modelo 3D é ativado apenas quando a espécie possui um pacote publicado para inspeção.</p>
          </div>

          <nav className="pokedex-species-nav" aria-label="Navegação pelo Índice Nacional">
            {previousDex ? (
              <a href={neighbourHref(previousDex)}>
                <span>ANTERIOR</span>
                <strong>#{String(previousDex).padStart(3, '0')}</strong>
              </a>
            ) : <span />}
            <a className="is-index" href="/pokedex">ÍNDICE 001—386</a>
            {nextDex ? (
              <a href={neighbourHref(nextDex)}>
                <span>PRÓXIMO</span>
                <strong>#{String(nextDex).padStart(3, '0')}</strong>
              </a>
            ) : <span />}
          </nav>
        </div>
      </section>
    </main>
  );
}
