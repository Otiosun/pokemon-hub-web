import type { ReactNode } from 'react';
import { HubModuleHeader } from '../../components/HubModuleHeader';
import './systems.css';

// Public, shareable systems surface. Keep independent from trainer authentication.

type Profession = {
  id: string;
  name: string;
  tier: 'COMUM' | 'PREMIUM';
  ability?: string;
  description: string;
  details: readonly string[];
  artSrc: string;
  price?: string;
};

const PROFESSIONS: readonly Profession[] = [
  {
    id: 'CRIADOR',
    name: 'Criador',
    tier: 'COMUM',
    ability: 'Criador Pokémon',
    description:
      'Treinadores especializados nos cuidados e desenvolvimento dos Pokémon. Possuem maior experiência em criação, alimentação e manutenção de Pokémon.',
    details: ['Possui +10 espaços no Box, aumentando seu limite inicial de 30 para 40 Pokémon.'],
    artSrc: '/systems-doc/10-profissao-criador.jpg',
  },
  {
    id: 'PESQUISADOR',
    name: 'Pesquisador',
    tier: 'COMUM',
    ability: 'Pesquisa de Campo',
    description:
      'Treinadores dedicados ao estudo e registro das espécies Pokémon. Conhecem melhor seus comportamentos, habitats e características.',
    details: [
      'Pode realizar 2 Pesquisas Pokédex por semana, escolhendo um Pokémon encontrado durante suas aventuras.',
      'Cada pesquisa consiste em uma pequena missão de observação, interação ou investigação relacionada ao Pokémon escolhido.',
      'Ao concluir, registra novas informações na Pokédex e recebe +50 XP.',
    ],
    artSrc: '/systems-doc/11-profissao-pesquisador.jpg',
  },
  {
    id: 'EXPLORADOR',
    name: 'Explorador',
    tier: 'COMUM',
    ability: 'Exploração',
    description:
      'Treinadores que dedicam sua jornada à descoberta de regiões, cavernas, ruínas e áreas desconhecidas.',
    details: [
      'Permite acessar áreas secundárias e locais secretos que não ficam disponíveis para outros treinadores.',
      'O acesso depende de requisitos específicos, como Pokémon, missões concluídas ou passagens ocultas.',
      'Essas áreas podem conter Pokémon exclusivos, itens raros, missões e eventos especiais.',
    ],
    artSrc: '/systems-doc/12-profissao-explorador.jpg',
  },
  {
    id: 'RANGER',
    name: 'Ranger',
    tier: 'COMUM',
    ability: 'Missões Ranger',
    description:
      'Treinadores especializados em proteger Pokémon e preservar áreas naturais. Atuam em resgates, investigações e ocorrências envolvendo Pokémon selvagens.',
    details: [
      'Recebe acesso ao Sistema de Missões Ranger, com missões exclusivas de resgate, proteção e investigação.',
    ],
    artSrc: '/systems-doc/13-profissao-ranger.jpg',
  },
  {
    id: 'PESCADOR',
    name: 'Pescador',
    tier: 'COMUM',
    ability: 'Pesca',
    description:
      'Treinadores especializados em pesca e na captura de Pokémon encontrados em rios, lagos e mares.',
    details: [
      'A pesca utiliza um D20 para determinar o resultado de cada tentativa.',
      '1 tentativa por atividade de pesca.',
      'D20: 1–9 comum · 10–14 incomum · 15–17 raro · 18–19 muito raro · 20 especial.',
      'Cada ponto de pesca possui sua própria tabela de Pokémon e recompensas.',
    ],
    artSrc: '/systems-doc/14-profissao-pescador.jpg',
  },
  {
    id: 'ARTESAO',
    name: 'Artesão',
    tier: 'COMUM',
    ability: 'Fabricação',
    description:
      'Treinadores especializados na fabricação e aprimoramento de objetos utilizados durante a jornada.',
    details: [
      'Possui acesso ao Sistema de Fabricação, transformando materiais em itens, equipamentos e Poké Bolas.',
      'No nível inicial, pode realizar 1 cena de fabricação de até 100 linhas por semana.',
      'Cada cena pode fabricar até 3 itens, desde que possua materiais e receita.',
    ],
    artSrc: '/systems-doc/15-profissao-artesao.gif',
  },
  {
    id: 'COORDENADOR',
    name: 'Coordenador',
    tier: 'COMUM',
    ability: 'Contest',
    description:
      'Treinadores que dominam apresentações Pokémon, utilizando movimentos e estratégias para criar performances.',
    details: [
      'Possui acesso ao Sistema de Contests.',
      'No nível inicial, pode participar de 1 Contest por semana, em uma cena de até 100 linhas.',
      'A avaliação considera criatividade, movimentos, combinação entre treinador e Pokémon e proposta do Contest.',
      'Vitórias podem render Fitas, itens especiais, dinheiro e novas categorias.',
    ],
    artSrc: '/systems-doc/16-profissao-coordenador.jpg',
  },
  {
    id: 'FOTOGRAFO',
    name: 'Fotógrafo',
    tier: 'PREMIUM',
    description:
      'Uma profissão exclusiva para treinadores que desejam registrar aquilo que normalmente passa despercebido.',
    details: [
      'Desbloqueia o Sistema de Fotografia, com mecânicas próprias, registros especiais e descobertas ao longo da aventura.',
      'Os registros podem revelar informações ocultas, acontecimentos raros e detalhes descobertos através da câmera.',
      'As fotografias podem ser adicionadas ao Álbum do Treinador.',
    ],
    artSrc: '/systems-doc/19-profissao-fotografo.jpg',
    price: '50 $',
  },
  {
    id: 'CAMPEAO',
    name: 'Campeão',
    tier: 'PREMIUM',
    description:
      'Forjado para a conquista e para a batalha desde o início de sua jornada.',
    details: [
      'Inicia sua jornada com 2 Pokémon iniciais de sua escolha.',
      'Desbloqueia vantagens especiais voltadas à evolução e ao combate.',
      'O documento prevê itens exclusivos, treinamentos especiais e acesso privilegiado a áreas e oportunidades de alto nível.',
    ],
    artSrc: '/systems-doc/20-profissao-campeao.jpg',
    price: '50 $',
  },
  {
    id: 'COLECIONADOR_TCG',
    name: 'Colecionador — TCG',
    tier: 'PREMIUM',
    description:
      'Tenha acesso ao Sistema de Pokémon TCG, transformando a coleção de cartas em uma nova forma de progressão dentro do RPG.',
    details: [
      'Colecione cartas, participe de competições, realize trocas e expanda sua coleção.',
      'Determinadas quantidades ou combinações de cartas podem ser convertidas em Pokémon.',
      'Cartas raras e coleções avançadas podem desbloquear trocas e recompensas especiais.',
    ],
    artSrc: '/systems-doc/21-profissao-colecionador-tcg.jpg',
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
  ['Treinamento de Combate', 'Focado em estratégias, esquivas, posicionamento, leitura do adversário e tomada de decisão durante as batalhas.'],
  ['Treinamento de Movimentos', 'Permite praticar e aperfeiçoar movimentos já conhecidos, trabalhando precisão, controle, potência e combinações.'],
  ['Treinamento de Resistência', 'Voltado para suportar esforços prolongados e melhorar a capacidade do Pokémon de continuar lutando em situações difíceis.'],
  ['Treinamento de Velocidade', 'Exercícios de movimentação, reflexos, perseguição e reação a estímulos.'],
  ['Treinamento de Técnica', 'Desenvolve o domínio de habilidades específicas do Pokémon e permite explorar novas maneiras de utilizá-las.'],
  ['Treinamento de Vínculo', 'Cenas focadas na relação entre treinador e Pokémon, fortalecendo a cooperação e a confiança entre ambos.'],
  ['Treinamento Especial', 'Métodos incomuns que exigem condições específicas, como locais, itens, NPCs ou acontecimentos da história.'],
] as const;

function DocArt({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      className={`systems-doc-art ${className}`.trim()}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={(event) => {
        event.currentTarget.hidden = true;
      }}
    />
  );
}

function BackToSystems() {
  return <a className="systems-back" href="/sistemas">‹ VOLTAR A SISTEMAS</a>;
}

function EditorialHeading({
  kicker,
  title,
  copy,
}: {
  kicker: string;
  title: string;
  copy: string;
}) {
  return (
    <header className="systems-editorial-heading">
      <span>{kicker}</span>
      <h1>{title}</h1>
      <p>{copy}</p>
    </header>
  );
}

export function SystemsPage() {
  return (
    <main className="systems-page">
      <HubModuleHeader module="systems" metaLabel="GUIAS" metaValue="03" />

      <section className="systems-intro">
        <EditorialHeading
          kicker="POKÉMON BEYOND"
          title="SISTEMAS DA JORNADA"
          copy="Bem-vindo a Pokémon Beyond, um RPG ambientado no universo Pokémon onde cada jogador constrói sua própria jornada. Explore regiões, conheça novos lugares, encontre Pokémon, forme sua equipe e viva histórias construídas a partir das suas próprias escolhas."
        />

        <DocArt
          src="/systems-doc/00-beyond-intro.jpg"
          alt="Arte de abertura de Pokémon Beyond"
          className="is-hero"
        />

        <div className="systems-document-copy">
          <p>
            O RPG combina narrativa, exploração e sistemas automatizados. A história acontece
            através das interações entre jogadores e narradores, enquanto o sistema registra sua
            jornada, Pokémon, itens, batalhas e progressão.
          </p>
        </div>

        <section className="systems-trainer-intro">
          <div>
            <span>ANTES DA JORNADA</span>
            <h2>CRIE SEU TREINADOR</h2>
            <p>
              Antes de começar sua jornada, crie o seu próprio treinador. Escolha seu nome,
              defina quem você será nesse mundo e prepare-se para escolher seu primeiro Pokémon.
            </p>
          </div>
          <DocArt
            src="/systems-doc/01-crie-seu-treinador.gif"
            alt="Arte de criação do treinador em Pokémon Beyond"
          />
        </section>
      </section>

      <section className="systems-index" aria-label="Sistemas disponíveis">
        <a href="/sistemas/profissoes">
          <DocArt src="/systems-doc/18-profissoes-premium.jpg" alt="" />
          <div>
            <small>01 · ESPECIALIZAÇÃO</small>
            <strong>PROFISSÕES</strong>
            <span>Escolha uma especialização e transforme sua profissão em parte real da jornada.</span>
            <b>ABRIR SISTEMA ›</b>
          </div>
        </a>

        <a href="/sistemas/progressao">
          <DocArt src="/systems-doc/30-progressao-abertura.gif" alt="" />
          <div>
            <small>02 · DESENVOLVIMENTO</small>
            <strong>PROGRESSÃO</strong>
            <span>Insígnias do treinador, XP individual dos Pokémon, níveis e evolução.</span>
            <b>ABRIR SISTEMA ›</b>
          </div>
        </a>

        <a href="/sistemas/treinamentos">
          <DocArt src="/systems-doc/40-treinamentos-abertura.gif" alt="" />
          <div>
            <small>03 · CENAS</small>
            <strong>TREINAMENTOS</strong>
            <span>Desenvolvimento por cenas, limites semanais e tipos de treinamento.</span>
            <b>ABRIR SISTEMA ›</b>
          </div>
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

      <section className="systems-intro is-subpage">
        <EditorialHeading
          kicker="ESPECIALIZAÇÃO DO TREINADOR"
          title="PROFISSÕES"
          copy="As profissões definem caminhos próprios dentro de Pokémon Beyond. Cada uma abre uma forma diferente de participar do mundo, com atividades, regras e sistemas ligados à especialização escolhida."
        />
        <DocArt
          src="/systems-doc/17-profissoes-transicao.jpg"
          alt="Arte de abertura das profissões de Pokémon Beyond"
          className="is-wide"
        />
      </section>

      <section className="systems-editorial-list">
        {common.map((profession, index) => (
          <ProfessionFeature key={profession.id} profession={profession} index={index} />
        ))}
      </section>

      <section className="systems-premium-intro">
        <div>
          <span>PROFISSÕES PREMIUM</span>
          <h2>UMA MECÂNICA PRÓPRIA NA JORNADA</h2>
          <p>
            Assuma uma profissão exclusiva dentro de Pokémon Beyond e desbloqueie sistemas que
            mudam a forma como você joga. Cada profissão oferece atividades exclusivas,
            recompensas adicionais e oportunidades que não estão disponíveis para treinadores
            comuns.
          </p>
        </div>
        <DocArt
          src="/systems-doc/18-profissoes-premium.jpg"
          alt="Arte de introdução das profissões Premium"
        />
      </section>

      <section className="systems-editorial-list is-premium">
        {premium.map((profession, index) => (
          <ProfessionFeature key={profession.id} profession={profession} index={index} />
        ))}
      </section>
    </main>
  );
}

function ProfessionFeature({ profession, index }: { profession: Profession; index: number }) {
  return (
    <article className={`systems-feature ${index % 2 === 1 ? 'is-reversed' : ''}`}>
      <DocArt src={profession.artSrc} alt={`Arte da profissão ${profession.name}`} />
      <div className="systems-feature-copy">
        <span>{profession.tier}</span>
        <h2>{profession.name}</h2>
        {profession.ability ? <strong>HABILIDADE · {profession.ability}</strong> : null}
        <p>{profession.description}</p>
        <ul>
          {profession.details.map((detail) => <li key={detail}>{detail}</li>)}
        </ul>
        {profession.price ? (
          <footer>
            <span>PREÇO</span>
            <b>{profession.price}</b>
          </footer>
        ) : null}
      </div>
    </article>
  );
}

export function ProgressionPage() {
  return (
    <main className="systems-page">
      <HubModuleHeader module="systems" metaLabel="REGRA" metaValue="XP" />
      <BackToSystems />

      <section className="systems-intro is-subpage">
        <EditorialHeading
          kicker="PROGRESSÃO"
          title="SISTEMA DE PROGRESSÃO"
          copy="A progressão em Pokémon Beyond é dividida entre Treinador e Pokémon. O treinador evolui através de Insígnias, enquanto cada Pokémon possui sua própria progressão através de XP."
        />
        <DocArt src="/systems-doc/30-progressao-abertura.gif" alt="Arte de abertura da progressão" className="is-wide" />
      </section>

      <section className="systems-longform">
        <EditorialBlock
          eyebrow="TREINADOR"
          title="PROGRESSÃO DO TREINADOR"
          art="/systems-doc/32-progressao-treinador.gif"
        >
          <p>
            As Insígnias representam o nível de experiência e desenvolvimento do treinador. Elas
            são conquistadas naturalmente durante a jornada, não ficando limitadas às batalhas de
            Ginásio.
          </p>
          <p>
            O treinador pode receber Insígnias ao participar de missões, concluir objetivos,
            explorar a região, participar de eventos, vencer batalhas, evoluir Pokémon e realizar
            atividades especiais.
          </p>
        </EditorialBlock>

        <EditorialBlock eyebrow="NÍVEL" title="1.000 INSÍGNIAS = +1 NÍVEL" art="/systems-doc/33-progressao-nivel.jpg" reversed>
          <p>
            O nível determina o estágio de progressão do treinador e pode ser utilizado como
            requisito para liberar novas áreas, sistemas, missões, competições, funcionalidades e
            desafios.
          </p>
          <p>
            As Insígnias continuam sendo acumuladas após o jogador subir de nível. Um treinador
            com 2.500 Insígnias está no Nível 2, com 500 Insígnias acumuladas para o próximo nível.
          </p>
        </EditorialBlock>

        <EditorialBlock eyebrow="INSÍGNIAS" title="COMO GANHAR" art="/systems-doc/34-progressao-insignias.gif">
          <ul>
            <li>Missões: recompensa de acordo com dificuldade e importância.</li>
            <li>Batalhas: Insígnias por participação e conquistas relevantes.</li>
            <li>Evolução: recompensa pela evolução de Pokémon.</li>
            <li>Exploração: Insígnias por descobrir locais e completar objetivos.</li>
            <li>Eventos: recompensas especiais de acordo com o evento.</li>
            <li>Pesca, Contest, Pesquisa e TCG também podem conceder Insígnias.</li>
          </ul>
        </EditorialBlock>

        <EditorialBlock eyebrow="POKÉMON" title="PROGRESSÃO DOS POKÉMON" art="/systems-doc/35-progressao-pokemon.gif" reversed>
          <p>
            Cada Pokémon possui seu próprio XP, separado das Insígnias do treinador. O XP é
            individual e determina o nível de cada Pokémon.
          </p>
          <p>
            Pokémon recebem XP principalmente em batalhas, mas determinadas missões, treinamentos
            e atividades também podem conceder experiência.
          </p>
        </EditorialBlock>

        <EditorialBlock eyebrow="EVOLUÇÃO" title="CONDIÇÕES DA ESPÉCIE" art="/systems-doc/36-progressao-evolucao.gif">
          <p>
            A evolução não depende apenas do nível. Cada espécie possui suas próprias condições,
            podendo exigir nível, item, amizade, horário, local, movimento específico ou outras
            condições especiais.
          </p>
          <p><b>Treinador:</b> Insígnias → Nível → novos conteúdos e acessos.</p>
          <p><b>Pokémon:</b> XP → Nível → movimentos, evolução e desenvolvimento individual.</p>
        </EditorialBlock>

        <EditorialBlock eyebrow="XP" title="PROGRESSÃO DE XP" art="/systems-doc/37-progressao-xp.gif" reversed>
          <p>
            Cada Pokémon começa no Nível 1 com 0 XP. Para subir de nível, precisa acumular a
            quantidade necessária de experiência.
          </p>
          <p>
            O XP é acumulativo: ao atingir o requisito, o Pokémon sobe de nível e qualquer XP
            excedente é mantido.
          </p>
        </EditorialBlock>

        <section className="systems-xp-section">
          <header>
            <span>TABELA OFICIAL</span>
            <h2>XP PARA O PRÓXIMO NÍVEL</h2>
          </header>
          <table className="xp-table" aria-label="XP por nível">
            <tbody>
              {XP_LEVELS.map(([from, to, xp]) => (
                <tr key={from}>
                  <td>Nv. {from}</td>
                  <td aria-hidden="true">→</td>
                  <td>Nv. {to}</td>
                  <td><strong>{xp} XP</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}

function EditorialBlock({
  eyebrow,
  title,
  art,
  reversed = false,
  children,
}: {
  eyebrow: string;
  title: string;
  art: string;
  reversed?: boolean;
  children: ReactNode;
}) {
  return (
    <article className={`systems-feature systems-longform-block ${reversed ? 'is-reversed' : ''}`}>
      <DocArt src={art} alt="" />
      <div className="systems-feature-copy">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        {children}
      </div>
    </article>
  );
}

export function TrainingPage() {
  return (
    <main className="systems-page">
      <HubModuleHeader module="systems" metaLabel="LIMITE" metaValue="03/SEM" />
      <BackToSystems />

      <section className="systems-intro is-subpage">
        <EditorialHeading
          kicker="TREINAMENTOS"
          title="DESENVOLVIMENTO EM CENA"
          copy="Os treinamentos permitem que o jogador desenvolva seus Pokémon através de cenas próprias, sem depender exclusivamente de batalhas para obter XP."
        />
        <DocArt src="/systems-doc/40-treinamentos-abertura.gif" alt="Arte de abertura dos treinamentos" className="is-wide" />
      </section>

      <section className="systems-longform">
        <EditorialBlock eyebrow="REGRA BASE" title="TREINAR É UMA CENA" art="/systems-doc/41-treinamentos-intro.gif">
          <p>
            O treinador pode criar uma cena de treinamento e trabalhar aspectos específicos do
            Pokémon, como movimentos, estratégia, resistência, controle e domínio de habilidades.
          </p>
          <p>
            Cada treinamento deve possuir um objetivo claro e ser narrado de forma coerente com o
            Pokémon e sua espécie.
          </p>
          <strong className="systems-callout">LIMITE · 3 TREINAMENTOS POR SEMANA · ATÉ 2 POKÉMON POR CENA</strong>
        </EditorialBlock>

        <EditorialBlock eyebrow="AVALIAÇÃO" title="RECOMPENSA DO TREINO" art="/systems-doc/42-treinamentos-tipos.gif" reversed>
          <p>
            Ao concluir a cena, o narrador determina a recompensa de acordo com a qualidade,
            dificuldade e desenvolvimento apresentado.
          </p>
        </EditorialBlock>

        <section className="systems-training-list">
          <header>
            <span>TIPOS DE TREINAMENTO</span>
            <h2>SETE FORMAS DE DESENVOLVER</h2>
          </header>

          <div>
            {TRAININGS.map(([name, description], index) => (
              <article key={name}>
                <small>{String(index + 1).padStart(2, '0')}</small>
                <h3>{name}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="systems-training-gallery">
          <DocArt src="/systems-doc/43-treino-combate-movimentos.gif" alt="Arte de treinamento de combate e movimentos" />
          <DocArt src="/systems-doc/44-treino-resistencia.gif" alt="Arte de treinamento de resistência" />
          <DocArt src="/systems-doc/45-treino-velocidade.gif" alt="Arte de treinamento de velocidade" />
        </div>
      </section>
    </main>
  );
}
