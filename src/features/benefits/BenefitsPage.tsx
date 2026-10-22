import { useEffect, useMemo, useState } from 'react';
import { HubModuleHeader } from '../../components/HubModuleHeader';
import {
  benefitDisplayState,
  benefitPresentation,
  getOwnBenefits,
  type OwnBenefitsResult,
  type PlayerBenefit,
} from '../../player-api/playerPortalBenefitsClient';
import './benefits-page.css';

type BenefitsState = { status: 'loading' } | OwnBenefitsResult;

/**
 * Original PNG icon sprites by Kenney (CC0), from a pinned community mirror.
 * No generated images. Only these known asset paths are ever rendered.
 */
const ASSET_ROOT = 'https://raw.githubusercontent.com/shorepine/kenney/3694c6879e487c108f55677be7dd2ca75b07cc3b/icons/Board%20Game%20Icons/Default%20(64px)/';
const SPRITES = {
  icon: `${ASSET_ROOT}tag_shield_infinite.png`,
  xp: `${ASSET_ROOT}hourglass.png`,
  luck: `${ASSET_ROOT}crown_a.png`,
  other: `${ASSET_ROOT}shield.png`,
};

function formattedDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
}

function endLabel(benefit: PlayerBenefit): string {
  if (benefit.grantModel === 'PERMANENT') return 'Sem prazo de expiração';
  return benefit.expiresAt === null ? 'Prazo não informado' : `Até ${formattedDate(benefit.expiresAt)}`;
}

function BenefitCard({ benefit }: { benefit: PlayerBenefit }) {
  const state = benefitDisplayState(benefit);
  const presentation = benefitPresentation(benefit.entitlementKey);
  const status = state === 'active' ? 'ATIVO' : state === 'expired' ? 'EXPIRADO' : 'REVOGADO';
  return (
    <article className="benefits-card" data-benefit-state={state}>
      <div className="benefits-card-art" aria-hidden="true">
        <img src={SPRITES[presentation.kind]} width={44} height={44} alt="" loading="lazy" />
      </div>
      <div className="benefits-card-content">
        <div className="benefits-card-heading">
          <div>
            <span className="benefits-card-eyebrow">
              {benefit.grantModel === 'PERMANENT' ? 'VANTAGEM PERMANENTE' : 'VANTAGEM TEMPORÁRIA'}
            </span>
            <h2>{presentation.name}</h2>
          </div>
          <span className="benefits-card-state">{status}</span>
        </div>
        <p>{presentation.description}</p>
        <dl className="benefits-card-details">
          <div><dt>Registrado em</dt><dd>{formattedDate(benefit.startsAt)}</dd></div>
          <div><dt>Validade</dt><dd>{endLabel(benefit)}</dd></div>
        </dl>
        {presentation.kind === 'other' ? <small className="benefits-card-key">Registro: {benefit.entitlementKey}</small> : null}
      </div>
    </article>
  );
}

export function BenefitsPage() {
  const [state, setState] = useState<BenefitsState>({ status: 'loading' });
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const result = await getOwnBenefits();
      if (mounted) setState(result);
    };
    void load();
    const refresh = () => {
      if (document.visibilityState === 'visible') void load();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      mounted = false;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const benefits = useMemo(() => {
    if (state.status !== 'authenticated') return [];
    const order = { active: 0, expired: 1, revoked: 2 };
    return [...state.benefits].sort((a, b) =>
      order[benefitDisplayState(a)] - order[benefitDisplayState(b)] ||
      a.entitlementKey.localeCompare(b.entitlementKey, 'pt-BR'));
  }, [state]);

  const activeCount = benefits.filter((b) => benefitDisplayState(b) === 'active').length;
  return (
    <main className="benefits-page">
      <HubModuleHeader module="journey"
        metaLabel="JORNADA"
        metaValue={state.status === 'authenticated' ? `${activeCount} ATIVO${activeCount === 1 ? '' : 'S'}` :
          state.status === 'loading' ? 'CONSULTANDO' : 'SEM CONEXÃO'} />
      <div className="benefits-shell">
        <header className="benefits-heading">
          <a href="/jornada" data-nav-mode="up" className="benefits-back">← Voltar à Jornada</a>
          <div className="benefits-heading-main">
            <span className="benefits-heading-kicker">REGISTRO PESSOAL / 01</span>
            <div className="benefits-heading-title">
              <div className="benefits-heading-sprite" aria-hidden="true">
                <img src={SPRITES.icon} width={58} height={58} alt="" />
              </div>
              <div>
                <h1>Meus Benefícios</h1>
                <p>As vantagens que realmente pertencem ao seu treinador, consultadas diretamente no registro oficial.</p>
              </div>
            </div>
          </div>
        </header>

        {state.status === 'loading' ? (
          <div className="benefits-state" role="status"><strong>Consultando seu registro…</strong>
            <p>Verificando as vantagens da sua conta.</p></div>
        ) : state.status === 'unauthenticated' ? (
          <div className="benefits-state" role="status"><strong>Sua sessão expirou.</strong>
            <p>Abra novamente o Hub pelo comando /hub no WhatsApp para consultar seus benefícios.</p></div>
        ) : state.status === 'unavailable' ? (
          <div className="benefits-state" role="status"><strong>Não foi possível confirmar seus benefícios.</strong>
            <p>O servidor está indisponível ou ainda não oferece essa consulta. Nenhuma vantagem foi marcada como ausente.</p>
            <button type="button" onClick={() => window.location.reload()}>Tentar novamente</button>
          </div>
        ) : benefits.length === 0 ? (
          <div className="benefits-state benefits-state-empty">
            <strong>Nenhuma vantagem registrada por enquanto.</strong>
            <p>Quando uma concessão oficial for confirmada, ela aparecerá aqui. Itens e Pokémon entregues são consultados nas suas respectivas coleções.</p>
          </div>
        ) : (
          <>
            <div className="benefits-summary">
              <div><span>ATIVOS</span><strong>{activeCount.toString().padStart(2, '0')}</strong></div>
              <div><span>REGISTRADOS</span><strong>{benefits.length.toString().padStart(2, '0')}</strong></div>
              <p>O status de cada vantagem é confirmado pela API do jogo. Benefícios expirados ou revogados permanecem visíveis.</p>
            </div>
            <section className="benefits-list" aria-label="Benefícios do treinador">
              {benefits.map((benefit) => <BenefitCard benefit={benefit} key={benefit.entitlementKey} />)}
            </section>
          </>
        )}
        <footer className="benefits-footer">
          <span>POKÉMON BEYOND · REGISTRO DE VANTAGENS</span>
          <small>Sprites: <a href="https://kenney.nl/assets/board-game-icons" target="_blank" rel="noreferrer">Kenney · CC0</a></small>
        </footer>
      </div>
    </main>
  );
}
