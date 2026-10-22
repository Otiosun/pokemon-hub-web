import { useEffect, useMemo, useState } from 'react';
import { HubModuleHeader } from '../../components/HubModuleHeader';
import {
  benefitIsActive,
  readPlayerBenefits,
  type PlayerBenefit,
  type PlayerBenefitsResult,
} from '../../player-api/playerPortalBenefitsClient';
import './benefits-page.css';

// Real artwork, not generated: Kenney CC0 "Medals" sprites,
// https://kenney.nl/ — pinned public mirror, SHA 3694c687...
const SPRITE_BASE =
  'https://raw.githubusercontent.com/shorepine/kenney/3694c6879e487c108f55677be7dd2ca75b07cc3b/2d/Medals/';
const art = {
  experience: SPRITE_BASE + 'shaded_medal7.png',
  fortune: SPRITE_BASE + 'shaded_medal5.png',
  generic: SPRITE_BASE + 'shaded_medal2.png',
};

export function benefitPresentation(key: string) {
  switch (key) {
    case 'XP_2X':
      return {
        name: 'Experiência em dobro',
        short: '2× XP',
        description: 'Experiência dobrada nas atividades elegíveis da sua jornada.',
        sprite: art.experience,
      };
    case 'CAPTURE_LUCK_2X':
      return {
        name: 'Bênção da Sorte',
        short: '2× Sorte',
        description: 'Bônus permanente de captura, aplicado conforme as regras do jogo.',
        sprite: art.fortune,
      };
    default:
      return {
        name: key.replaceAll('_', ' '),
        short: 'Benefício',
        description: 'Vantagem registrada na sua conta pelo servidor do jogo.',
        sprite: art.generic,
      };
  }
}

function dateLabel(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}
function benefitLabel(item: PlayerBenefit, now: number) {
  if (item.administrativeStatus === 'REVOKED') return 'REVOGADO';
  return benefitIsActive(item, now) ? 'ATIVO' : 'EXPIRADO';
}

function BenefitCard({ item, now }: { item: PlayerBenefit; now: number }) {
  const display = benefitPresentation(item.entitlementKey);
  const active = benefitIsActive(item, now);
  const label = benefitLabel(item, now);
  return (
    <article className={`journey-benefit-card${active ? ' is-active' : ' is-inactive'}`}>
      <div className="journey-benefit-emblem" aria-hidden="true">
        <img loading="lazy" src={display.sprite} alt="" width="72" height="72" />
      </div>
      <div className="journey-benefit-info">
        <div className="journey-benefit-eyebrow">
          <span>{item.grantModel === 'PERMANENT' ? 'ACESSO PERMANENTE' : 'VANTAGEM TEMPORÁRIA'}</span>
          <span className="journey-benefit-state">{label}</span>
        </div>
        <h2>{display.name}</h2>
        <p>{display.description}</p>
        <dl className="journey-benefit-facts">
          <div><dt>Concedido em</dt><dd>{dateLabel(item.startsAt)}</dd></div>
          <div>
            <dt>Validade</dt>
            <dd>{item.grantModel === 'PERMANENT'
              ? 'Sem expiração'
              : item.expiresAt ? dateLabel(item.expiresAt) : 'Data não informada'}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

export function BenefitsPage() {
  const [state, setState] = useState<PlayerBenefitsResult | { status: 'loading' }>({ status: 'loading' });
  const [lastRead, setLastRead] = useState(Date.now());

  useEffect(() => {
    let active = true;
    const load = () => {
      void readPlayerBenefits()
        .then((next) => {
          if (!active) return;
          setState(next);
          setLastRead(Date.now());
        })
        .catch(() => {
          if (active) setState({ status: 'unavailable' });
        });
    };
    load();
    const onFocus = () => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener('focus', onFocus);
    return () => { active = false; window.removeEventListener('focus', onFocus); };
  }, []);

  const { enabled, history } = useMemo(() => {
    if (state.status !== 'ready') return { enabled: [] as PlayerBenefit[], history: [] as PlayerBenefit[] };
    return {
      enabled: state.entitlements.filter((x) => benefitIsActive(x, lastRead)),
      history: state.entitlements.filter((x) => !benefitIsActive(x, lastRead)),
    };
  }, [state, lastRead]);

  return (
    <main className="journey-benefits-page">
      <HubModuleHeader
        module="journey"
        metaLabel="JORNADA"
        metaValue="MEUS BENEFÍCIOS"
      />
      <div className="journey-benefits-shell">
        <div className="journey-benefits-back"><a href="/jornada" data-nav-mode="up">← Voltar à Jornada</a></div>
        <header className="journey-benefits-header">
          <div className="journey-benefits-heading">
            <span className="journey-benefits-kicker">REGISTRO DO TREINADOR · VANTAGENS</span>
            <h1>Meus Benefícios</h1>
            <p>As vantagens que realmente estão vinculadas ao seu registro no Pokémon Beyond.</p>
          </div>
          <div className="journey-benefits-seal" aria-hidden="true">
            <img src={art.experience} alt="" width="88" height="88" />
          </div>
        </header>

        {state.status === 'loading' ? (
          <section className="journey-benefits-message" role="status">Consultando o registro oficial de benefícios…</section>
        ) : state.status === 'unauthenticated' ? (
          <section className="journey-benefits-message" role="status">
            Sua sessão não está ativa. Abra o Hub novamente pelo link do bot.
          </section>
        ) : state.status === 'unavailable' ? (
          <section className="journey-benefits-message is-warning" role="status">
            Ainda não foi possível consultar seus benefícios. Isso <strong>não</strong> significa que você não possui nenhum.
          </section>
        ) : (
          <>
            <section className="journey-benefits-group" aria-labelledby="benefits-active-heading">
              <div className="journey-benefits-group-heading">
                <div><span>01 / ATUAIS</span><h2 id="benefits-active-heading">Benefícios ativos</h2></div>
                <small>{enabled.length} {enabled.length === 1 ? 'ATIVO' : 'ATIVOS'}</small>
              </div>
              {enabled.length === 0 ? (
                <div className="journey-benefits-empty">
                  <strong>Nenhuma vantagem ativa por enquanto.</strong>
                  <p>Assim que uma concessão for registrada no jogo, aparecerá aqui. Itens e Pokémon entregues são consultados em suas respectivas seções.</p>
                </div>
              ) : <div className="journey-benefits-list">{enabled.map((item) => (
                <BenefitCard key={item.entitlementKey} item={item} now={lastRead} />
              ))}</div>}
            </section>

            {history.length > 0 ? (
              <section className="journey-benefits-group is-history" aria-labelledby="benefits-history-heading">
                <div className="journey-benefits-group-heading">
                  <div><span>02 / REGISTROS ANTERIORES</span><h2 id="benefits-history-heading">Histórico</h2></div>
                  <small>{history.length} {history.length === 1 ? 'REGISTRO' : 'REGISTROS'}</small>
                </div>
                <div className="journey-benefits-list">
                  {history.map((item) => <BenefitCard key={item.entitlementKey} item={item} now={lastRead} />)}
                </div>
              </section>
            ) : null}
            <footer className="journey-benefits-footer">
              <span>Sincronizado com o registro oficial do servidor.</span>
              <span>Sem confirmação automática de pagamento.</span>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
