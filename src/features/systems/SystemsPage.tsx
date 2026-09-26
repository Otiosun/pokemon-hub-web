import { HubModuleHeader } from '../../components/HubModuleHeader';
import './systems.css';

type Profession = {
  id: string;
  name: string;
  tier: 'COMUM' | 'PREMIUM';
  ability: string;
  summary: string;
  rules: readonly string[];
  price?: string;
};

const PROFESSIONS: readonly Profession[] = [
  {
    id: 'CRIADOR',
    name: 'Criador',
    tier: 'COMUM',
    ability: 'Criador Pokémon',
    summary: 'Especialista no cuidado, criação e desenvolvimento de Pokémon.',
    rules: ['Expande a capacidade do Box em +10 espaços: de 30 para 40 Pokémon.'],
  },
  {
    id: 'PESQUISADOR',
    name: 'Pesquisador',
    tier: 'COMUM',
    ability: 'Pesquisa de Campo',
    summary: 'Focado em observação, investigação e registro de espécies.',
    rules: [
      'Pode realizar até 2 Pesquisas Pokédex por semana.',
      'A pesquisa parte de um Pokémon encontrado e exige uma pequena missão de observação ou investigação.',
      'Ao concluir, registra informações e recebe +50 XP conforme a regra do RPG.',
    ],
  },
  {
    id: 'EXPLORADOR',
    name: 'Explorador',
    tier: 'COMUM',
    ability: 'Exploração',
    summary: 'Especialista em encontrar caminhos, áreas e oportunidades fora da rota principal.',
    rules: [
      'Pode acessar áreas secundárias e secretas quando cumprir os requisitos.',
      'Essas áreas podem conter Pokémon, itens, missões ou eventos exclusivos.',
    ],
  },
  {
    id: 'RANGER',
    name: 'Ranger',
    tier: 'COMUM',
    ability: 'Missões Ranger',
    summary: 'Atua em missões ligadas à proteção, resgate e equilíbrio entre pessoas e Pokémon.',
    rules: ['Desbloqueia acesso ao sistema de Missões Ranger.'],
  },
  {
    id: 'PESCADOR',
    name: 'Pescador',
    tier: 'COMUM',
    ability: 'Pesca',
    summary: 'Especializado em encontros aquáticos por meio do sistema de pesca.',
    rules: [
      'Cada atividade de pesca permite 1 tentativa.',
      'D20: 1–9 comum · 10–14 incomum · 15–17 raro · 18–19 muito raro · 20 especial.',
    ],
  },
  {
    id: 'ARTESAO',
    name: 'Artesão',
    tier: 'COMUM',
    ability: 'Fabricação',
    summary: 'Transforma materiais e receitas em itens por meio de cenas de crafting.',
    rules: [
      'Inicialmente: 1 cena de fabricação por semana, com até 100 linhas.',
      'Pode fabricar até 3 itens por cena, desde que possua materiais e receita.',
    ],
  },
  {
    id: 'COORDENADOR',
    name: 'Coordenador',
    tier: 'COMUM',
    ability: 'Contest',
    summary: 'Focado em apresentações, criatividade e sintonia entre treinador e Pokémon.',
    rules: [
      'Inicialmente: 1 Contest por semana, em cena de até 100 linhas.',
      'A avaliação considera criatividade, movimentos, combinação treinador/Pokémon e proposta.',
      'Recompensas podem incluir fitas, itens, dinheiro e outros prêmios definidos pela narração.',
    ],
  },
  {
    id: 'FOTOGRAFO',
    name: 'Fotógrafo',
    tier: 'PREMIUM',
    ability: 'Fotografia',
    summary: 'Registra Pokémon, locais e acontecimentos raros durante a jornada.',
    rules: [
      'Desbloqueia o sistema de fotografia e álbum.',
      'Registros podem revelar informações, ocorrências e descobertas especiais.',
    ],
    price: '50 $',
  },
  {
    id: 'CAMPEAO',
    name: 'Campeão',
    tier: 'PREMIUM',
    ability: 'Jornada de Campeão',
    summary: 'Profissão orientada a batalhas, conquista e desenvolvimento competitivo.',
    rules: [
      'Começa a jornada com 2 Pokémon iniciais à escolha.',
      'O documento prevê vantagens especiais de batalha/evolução, itens, treinamentos e acessos de alto nível.',
    ],
  },
  {
    id: 'COLECIONADOR_TCG',
    name: 'Colecionador — TCG',
    tier: 'PREMIUM',
    ability: 'TCG',
    summary: 'Desbloqueia a vertente de cartas e coleção dentro de Pokémon Beyond.',
    rules: [
      'Permite colecionar cartas, competir, trocar e progredir no sistema TCG.',
      'O documento prevê conversões de quantidades/combinações de cartas em Pokémon.',
    ],
    price: '50 $',
  },
];

const XP_LEVELS = [
  [1, 2, 100],
  [2, 3, 150],
  [3, 4, 200],
  [4, 5, 250],
  [5, 6, 300],
  [6, 7, 350],
  [7, 8, 400],
  [8, 9, 450],
  [9, 10, 500],
] as const;

const TRAININGS = [
  ['Combate', 'Prática de luta e tomada de decisão em batalha.'],
  ['Movimentos', 'Desenvolvimento e domínio de golpes.'],
  ['Resistência', 'Condicionamento e capacidade de suportar esforço.'],
  ['Velocidade', 'Treino focado em deslocamento, reação e agilidade.'],
  ['Técnica', 'Aprimoramento de execução e controle.'],
  ['Vínculo', 'Desenvolvimento da relação entre treinador e Pokémon.'],
  ['Especial', 'Treino que não se encaixa nas categorias anteriores e depende da proposta da cena.'],
] as const;

function BackToSystems() {
  return <a className="systems-back" href="/sistemas">‹ VOLTAR A SISTEMAS</a>;
}

export function SystemsPage() {
  return (
    <main className="systems-page">
      <HubModuleHeader module="systems" metaLabel="GUIAS" metaValue="03" />
      <section className="systems-hero">
        <span>POKÉMON BEYOND · MANUAL DE JOGO</span>
        <h1>SISTEMAS</h1>
        <p>Regras que orientam sua jornada. Consulte antes de escolher, treinar ou planejar progressão.</p>
      </section>

      <section className="systems-index" aria-label="Sistemas disponíveis">
        <a href="/sistemas/profissoes">
          <small>01</small>
          <strong>PROFISSÕES</strong>
          <span>Especializações, habilidades e opções Premium.</span>
          <b>ABRIR ›</b>
        </a>
        <a href="/sistemas/progressao">
          <small>02</small>
          <strong>PROGRESSÃO</strong>
          <span>Insígnias do treinador, XP dos Pokémon e evolução.</span>
          <b>ABRIR ›</b>
        </a>
        <a href="/sistemas/treinamentos">
          <small>03</small>
          <strong>TREINAMENTOS</strong>
          <span>Limites semanais, cenas e tipos de desenvolvimento.</span>
          <b>ABRIR ›</b>
        </a>
      </section>
    </main>
  );
}

export function ProfessionsPage() {
  const common = PROFESSIONS.filter((profession) => profession.tier === 'COMUM');
  const premium = PROFESSIONS.filter((profession) => profession.tier === 'PREMIUM');

  return (
    <main className="systems-page">
      <HubModuleHeader module="systems" metaLabel="PROFISSÕES" metaValue={String(PROFESSIONS.length).padStart(2, '0')} />
      <BackToSystems />
      <section className="systems-hero is-compact">
        <span>ESPECIALIZAÇÃO DO TREINADOR</span>
        <h1>PROFISSÕES</h1>
        <p>A profissão define uma especialização do personagem. Os efeitos abaixo reproduzem as regras do documento do RPG; o Hub não concede benefícios automaticamente.</p>
      </section>

      <section className="systems-section">
        <header><span>BASE</span><h2>PROFISSÕES COMUNS</h2></header>
        <div className="profession-grid">
          {common.map((profession) => <ProfessionCard key={profession.id} profession={profession} />)}
        </div>
      </section>

      <section className="systems-section is-premium">
        <header><span>PREMIUM</span><h2>PROFISSÕES PREMIUM</h2></header>
        <div className="profession-grid">
          {premium.map((profession) => <ProfessionCard key={profession.id} profession={profession} />)}
        </div>
      </section>
    </main>
  );
}

function ProfessionCard({ profession }: { profession: Profession }) {
  return (
    <article className="profession-card">
      <header>
        <div>
          <small>{profession.tier}</small>
          <h3>{profession.name}</h3>
        </div>
        {profession.price ? <strong>{profession.price}</strong> : null}
      </header>
      <span className="profession-ability">{profession.ability}</span>
      <p>{profession.summary}</p>
      <ul>{profession.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
    </article>
  );
}

export function ProgressionPage() {
  return (
    <main className="systems-page">
      <HubModuleHeader module="systems" metaLabel="REGRA" metaValue="XP" />
      <BackToSystems />
      <section className="systems-hero is-compact">
        <span>DESENVOLVIMENTO</span>
        <h1>PROGRESSÃO</h1>
        <p>Treinador e Pokémon evoluem por trilhas diferentes: Insígnias para o treinador e XP individual para cada Pokémon.</p>
      </section>

      <section className="systems-rule-grid">
        <article>
          <span>TREINADOR</span>
          <h2>INSÍGNIAS</h2>
          <strong>1.000 Insígnias = +1 nível</strong>
          <p>Insígnias podem vir de missões, batalhas, evolução, exploração, eventos e sistemas secundários como pesca, Contest, pesquisa e TCG.</p>
        </article>
        <article>
          <span>POKÉMON</span>
          <h2>XP INDIVIDUAL</h2>
          <strong>O excesso de XP é preservado</strong>
          <p>Cada Pokémon acumula sua própria experiência. Evoluções seguem as condições da espécie e não são reduzidas a uma única regra de nível.</p>
        </article>
      </section>

      <section className="systems-section">
        <header><span>TABELA</span><h2>XP PARA O PRÓXIMO NÍVEL</h2></header>
        <div className="xp-table" role="table" aria-label="XP por nível">
          {XP_LEVELS.map(([from, to, xp]) => (
            <div role="row" key={from}>
              <span role="cell">Nv. {from}</span>
              <b aria-hidden="true">→</b>
              <span role="cell">Nv. {to}</span>
              <strong role="cell">{xp} XP</strong>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export function TrainingPage() {
  return (
    <main className="systems-page">
      <HubModuleHeader module="systems" metaLabel="LIMITE" metaValue="03/SEM" />
      <BackToSystems />
      <section className="systems-hero is-compact">
        <span>DESENVOLVIMENTO EM CENA</span>
        <h1>TREINAMENTOS</h1>
        <p>Cenas de treinamento desenvolvem Pokémon fora das batalhas. A recompensa depende da qualidade, dificuldade e desenvolvimento avaliados pela narração.</p>
      </section>

      <section className="systems-rule-grid">
        <article>
          <span>LIMITE SEMANAL</span>
          <h2>3 TREINAMENTOS</h2>
          <strong>Até 2 Pokémon por cena</strong>
          <p>Cada treino deve ter objetivo claro e narração coerente com o que está sendo desenvolvido.</p>
        </article>
        <article>
          <span>RECOMPENSA</span>
          <h2>AVALIAÇÃO NARRATIVA</h2>
          <strong>XP conforme a cena</strong>
          <p>O narrador define o ganho a partir da proposta, execução, dificuldade e desenvolvimento apresentado.</p>
        </article>
      </section>

      <section className="systems-section">
        <header><span>CATEGORIAS</span><h2>TIPOS DE TREINO</h2></header>
        <div className="training-grid">
          {TRAININGS.map(([name, description], index) => (
            <article key={name}>
              <small>{String(index + 1).padStart(2, '0')}</small>
              <h3>{name}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
