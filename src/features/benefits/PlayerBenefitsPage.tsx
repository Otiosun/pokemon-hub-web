import { useEffect, useMemo, useState } from 'react';
import { HubModuleHeader } from '../../components/HubModuleHeader';
import {
  benefitDisplayState,
  benefitTitle,
  getPlayerBenefits,
  type PlayerBenefit,
  type PlayerBenefitsResponse,
} from '../../player-api/playerBenefitsClient';
import './player-benefits.css';

// Existing original PNG icons from Kenney's CC0 Game Icons collection.
// Pinned to a public revision: no procedural art or generated images.
const ICON_ROOT =
  'https://raw.githubusercontent.com/shorepine/kenney/3694c6879e487c108f55677be7dd2ca75b07cc3b/icons/Game%20Icons/Black/2x';
const ICONS = {
  XP_2X: `${ICON_ROOT}/medal1.png`,
  LUCK_2X: `${ICON_ROOT}/star.png`,
  fallback: `${ICON_ROOT}/power.png`,
} as const;

function benefitIcon(key: string) {
  if (key === 'XP_2X' || key === 'LUCK_2X') return ICONS[key];
  return ICONS.fallback;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(value));
}

function remainingLabel(expiresAt: string, now: number) {
  const minutes = Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 60_000));
  if (minutes < 60) return `${minutes} min restantes`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 48) return `${hours} h restantes`;
  const days = Math.ceil(hours / 24);
  return `${days} dias restantes`;
}

function BenefitCard({
  benefit,
  now,
}: { benefit: PlayerBenefit; now: number }) {
  const state = benefitDisplayState(benefit, now);
  const active = state === 'active';
  const status = active ? 'ATIVO' : state === 'revoked' ? 'REVOGADO' : 'EXPIRADO';
  return (
    <article className="benefit-entry" data-status={state}>
      <div className="benefit-entry-icon">
        <img src={benefitIcon(benefit.entitlementKey)} alt="" loading="lazy" />
      </div>
      <div className="benefit-entry-main">
        <div className="benefit-entry-topline">
          <span className="benefit-entry-kind">
            {benefit.grantModel === 'PERMANENT' ? 'ACESSO PERMANENTE' : 'BENEFÍCIO TEMPORÁRIO'}
          </span>
          <strong className="benefit-entry-status">{status}</strong>
        </div>
        <h3>{benefitTitle(benefit.entitlementKey)}</h3>
        <p>{benefit.entitlementKey === 'XP_2X'
          ? 'Multiplicador de experiência conforme as regras do jogo.'
          : benefit.entitlementKey === 'LUCK_2X'
            ? 'Vantagem de sorte enquanto o benefício estiver ativo.'
            : 'Benefício registrado oficialmente na sua conta.'}</p>
        <div className="benefit-entry-foot">
          <span>Desde {dateLabel(benefit.startsAt)}</span>
          <span>{benefit.grantModel === 'PERMANENT' ? 'Sem expiração'
            : active && benefit.expiresAt ? remainingLabel(benefit.expiresAt, now)
              : benefit.expiresAt ? `Encerrado em ${dateLabel(benefit.expiresAt)}`
                : 'Prazo indisponível'}</span>
        </div>
      </div>
    </article>
  );
}

export function PlayerBenefitsPage() {
  const [state, setState] = useState<PlayerBenefitsResponse | { status: 'loading' }>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let alive = true;
    const load = async (silent = false) => {
      if (!silent) setState({ status: 'loading' });
      if (silent) setRefreshing(true);
      try {
        const response = await getPlayerBenefits();
        if (alive) {
          setState(response);
          setNow(Date.now());
        }
      } catch {
        if (alive) setState({ status: 'unavailable' });
      } finally {
        if (alive) setRefreshing(false);
      }
    };
    void load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load(true);
    };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const records = state.status === 'authenticated' ? state.entitlements : [];
  const active = useMemo(() => records
    .filter((record) => benefitDisplayState(record, now) === 'active')
    .sort((a, b) => a.entitlementKey.localeCompare(b.entitlementKey)), [records, now]);
  const old = useMemo(() => records
    .filter((record) => benefitDisplayState(record, now) !== 'active')
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt)), [records, now]);

  return (
    <main className="player-benefits-page">
      <HubModuleHeader
        module="journey"
        metaLabel="BENEFÍCIOS"
        metaValue={state.status === 'authenticated' ? `${active.length} ATIVO${active.length === 1 ? '' : 'S'}`
          : state.status === 'loading' ? 'SINCRONIZANDO' : 'INDISPONÍVEL'}
      />
      <div className="player-benefits-shell">
        <nav className="player-benefits-breadcrumb" aria-label="Você está em">
          <a href="/jornada" data-nav-mode="up">JORNADA</a>
          <span aria-hidden="true">/</span>
          <strong>MEUS BENEFÍCIOS</strong>
        </nav>
        <header className="player-benefits-header">
          <div>
            <span className="player-benefits-eyebrow">REGISTRO PESSOAL · POKÉMON BEYOND</span>
            <h1>Meus benefícios<span className="player-benefits-title-mark">.</span></h1>
            <p>Suas vantagens registradas no jogo, com duração e situação atual.
              Este painel não ativa benefícios nem confirma compras.</p>
          </div>
          <div className="player-benefits-seal" aria-hidden="true">
            <img src={ICONS.fallback} alt="" />
          </div>
        </header>

        <section className="player-benefits-content" aria-live="polite">
          <div className="player-benefits-section-head">
            <div>
              <small>01 / REGISTRO</small>
              <h2>Benefícios ativos</h2>
            </div>
            <span className="player-benefits-count">{state.status === 'authenticated' ? String(active.length).padStart(2,'0') : '—'}</span>
          </div>

          {state.status === 'loading' ? (
            <div className="player-benefits-state">Sincronizando seus benefícios…</div>
          ) : state.status === 'unauthenticated' ? (
            <div className="player-benefits-state">
              Sua sessão terminou. Abra novamente o Hub pelo comando <strong>/hub</strong> no bot.
            </div>
          ) : state.status === 'unavailable' ? (
            <div className="player-benefits-state is-unavailable">
              A consulta aos benefícios ainda não está disponível. Nenhuma informação foi presumida.
              <small>O servidor precisa disponibilizar a leitura autenticada dessa seção.</small>
            </div>
          ) : active.length === 0 ? (
            <div className="player-benefits-state is-empty">
              <span>SEM BENEFÍCIOS ATIVOS</span>
              <p>Nenhuma vantagem ativa consta no registro oficial neste momento.</p>
            </div>
          ) : (
            <div className="player-benefits-list">
              {active.map((benefit) => <BenefitCard benefit={benefit} now={now} key={benefit.entitlementKey} />)}
            </div>
          )}

          {state.status === 'authenticated' && old.length > 0 ? (
            <details className="player-benefits-history">
              <summary>
                <span>Benefícios anteriores</span>
                <small>{old.length} REGISTRO{old.length === 1 ? '' : 'S'}</small>
              </summary>
              <div className="player-benefits-list">
                {old.map((benefit) => <BenefitCard benefit={benefit} now={now} key={benefit.entitlementKey} />)}
              </div>
            </details>
          ) : null}
        </section>

        <footer className="player-benefits-footer">
          <span>FONTE: REGISTRO OFICIAL DA CONTA</span>
          <a href="/jornada" data-nav-mode="up">Voltar à Jornada <span aria-hidden="true">↗</span></a>
        </footer>
      </div>
    </main>
  );
}
