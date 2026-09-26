import { useMemo, useState } from 'react';
import { HubMenuTrigger } from '../../components/HubNavigation';
import { usePlayerPortalAdmin } from '../../player-api/usePlayerPortalAdmin';
import './admin-page.css';
import './admin-guide.css';

type GuideCommand = {
  command: string;
  aliases?: readonly string[];
  title: string;
  description: string;
  section: 'ADM' | 'RECEPÇÃO' | 'NARRAÇÃO' | 'CONFIGURAÇÃO' | 'JOGADOR';
  required?: readonly string[];
  note?: string;
};

type GuideModule = {
  title: string;
  href: string | null;
  detail: string;
  steps: readonly string[];
  prefixes: readonly string[];
  ownerOnly?: boolean;
};

const ADMIN_COMMANDS: readonly GuideCommand[] = [
  {
    command: '/adm dinheiro +500 para @jogador | motivo',
    aliases: ['/admin dinheiro …'],
    title: 'Dar ou retirar dinheiro',
    description: 'Cria um preview auditado para um ou vários jogadores. Nada muda antes da confirmação.',
    section: 'ADM',
    required: ['wallet.adjust', 'player.read', 'batch.preview', 'batch.execute.low_risk'],
    note: 'Responda ao preview com /adm confirmar para aplicar.',
  },
  {
    command: '/adm xp +50 para @jogador | motivo',
    title: 'Ajustar progressão',
    description: 'Soma ou remove pontos de progressão de um ou vários jogadores.',
    section: 'ADM',
    required: ['progression.adjust', 'player.read', 'batch.preview', 'batch.execute.low_risk'],
    note: 'Aceita nomes separados por vírgula e menções reais.',
  },
  {
    command: '/adm item potion +2 para @jogador | motivo',
    title: 'Dar ou retirar item',
    description: 'Resolve o item pelo catálogo atual e mostra preview antes de executar.',
    section: 'ADM',
    required: ['inventory.adjust', 'inventory.read', 'player.read', 'batch.preview', 'batch.execute.low_risk'],
  },
  {
    command: '/adm visto Pikachu para @jogador | motivo',
    title: 'Registrar Pokémon visto',
    description: 'Adiciona registro de visto na Pokédex sem precisar editar banco ou ficha manualmente.',
    section: 'ADM',
    required: ['pokedex.seen.grant', 'pokedex.read', 'player.read', 'batch.preview', 'batch.execute.low_risk'],
  },
  {
    command: '/adm confirmar',
    title: 'Confirmar preview administrativo',
    description: 'Aplica um lote previamente preparado.',
    section: 'ADM',
    required: ['batch.execute.low_risk'],
    note: 'Tem que ser resposta direta ao preview gerado pelo próprio administrador.',
  },
  {
    command: '/verficha',
    title: 'Abrir ficha para revisão',
    description: 'Mostra novamente a ficha de cadastro que chegou à Recepção.',
    section: 'RECEPÇÃO',
    required: ['player.registration.read'],
    note: 'Use respondendo diretamente à notificação da ficha.',
  },
  {
    command: '/aprovar',
    title: 'Aprovar cadastro',
    description: 'Aprova a ficha e inicia o provisionamento do treinador.',
    section: 'RECEPÇÃO',
    required: ['player.registration.approve'],
    note: 'Use respondendo diretamente à notificação da ficha.',
  },
  {
    command: '/ajustes',
    title: 'Pedir ajustes',
    description: 'Devolve a ficha para edição preservando o que o jogador já enviou.',
    section: 'RECEPÇÃO',
    required: ['player.registration.request_changes'],
    note: 'Use respondendo diretamente à notificação da ficha.',
  },
  {
    command: '/rejeitar',
    title: 'Rejeitar cadastro',
    description: 'Encerra a revisão atual como rejeitada.',
    section: 'RECEPÇÃO',
    required: ['player.registration.reject'],
    note: 'Use respondendo diretamente à notificação da ficha.',
  },
  {
    command: '/spawn @treinador',
    title: 'Gerar encontro selvagem',
    description: 'Cria um encontro para o treinador marcado e valida a party co-localizada.',
    section: 'NARRAÇÃO',
    required: ['encounter.support'],
    note: 'Use em grupo habilitado para PVE.',
  },
  {
    command: '/iniciarbatalha @treinador',
    title: 'Transformar encontro em batalha',
    description: 'Avança o encontro atual do treinador para o combate PVE.',
    section: 'NARRAÇÃO',
    required: ['encounter.support'],
  },
  {
    command: '/assumir',
    title: 'Narrador assume o selvagem',
    description: 'Transfere o controle do Pokémon selvagem da automação para o narrador autorizado.',
    section: 'NARRAÇÃO',
    required: ['encounter.support'],
  },
  {
    command: '/automatico',
    title: 'Devolver selvagem à IA',
    description: 'Retorna o controle do oponente PVE para o automático.',
    section: 'NARRAÇÃO',
    required: ['encounter.support'],
  },
  {
    command: '/grupo jogo Nome do grupo',
    title: 'Habilitar grupo de jogo',
    description: 'Registra o grupo atual como grupo de jogo do RPG.',
    section: 'CONFIGURAÇÃO',
    required: ['community.group.manage'],
    note: 'Envie dentro do próprio grupo.',
  },
  {
    command: '/grupo recepcao Nome do grupo',
    title: 'Habilitar Recepção',
    description: 'Registra o grupo atual como Recepção de cadastro e revisão.',
    section: 'CONFIGURAÇÃO',
    required: ['community.group.manage'],
    note: 'Envie dentro do próprio grupo.',
  },
  {
    command: '/teste',
    title: 'Central de testes',
    description: 'Abre o menu de preparação e diagnóstico de UAT.',
    section: 'CONFIGURAÇÃO',
    required: ['UAT_BOOTSTRAP'],
  },
  {
    command: '/teste eu',
    title: 'Diagnóstico do próprio jogador',
    description: 'Mostra acesso, área, party, roster e prontidão PVE/PVP.',
    section: 'CONFIGURAÇÃO',
    required: ['UAT_BOOTSTRAP'],
  },
  {
    command: '/teste preparar @jogador',
    title: 'Preparar jogador para UAT',
    description: 'Cria/prepara o estado mínimo necessário para testes mecânicos.',
    section: 'CONFIGURAÇÃO',
    required: ['UAT_BOOTSTRAP'],
  },
  {
    command: '/hub',
    title: 'Abrir Hub',
    description: 'Gera um link pessoal de acesso ao Hub. O link expira e só pode ser usado uma vez.',
    section: 'CONFIGURAÇÃO',
  },
];

const PLAYER_COMMANDS: readonly GuideCommand[] = [
  { command: '/menu', aliases: ['/ajuda', '/comandos'], title: 'Menu geral', description: 'Mostra os atalhos principais do jogo.', section: 'JOGADOR' },
  { command: '/registrar', title: 'Cadastro', description: 'Começa ou retoma o cadastro do treinador.', section: 'JOGADOR' },
  { command: '/modo guiado', title: 'Modo de cadastro', description: 'Alterna o cadastro para o modo guiado ou completo.', section: 'JOGADOR' },
  { command: '/iniciais', title: 'Iniciais', description: 'Mostra as opções de Pokémon inicial durante o cadastro.', section: 'JOGADOR' },
  { command: '/ficha', title: 'Ficha', description: 'Mostra a ficha atual do cadastro.', section: 'JOGADOR' },
  { command: '/salvar', title: 'Salvar cadastro', description: 'Salva o rascunho atual da ficha.', section: 'JOGADOR' },
  { command: '/continuar', title: 'Continuar cadastro', description: 'Retoma um rascunho salvo.', section: 'JOGADOR' },
  { command: '/editar', title: 'Editar cadastro', description: 'Reabre edição quando permitido.', section: 'JOGADOR' },
  { command: '/confirmar', title: 'Confirmar cadastro', description: 'Confirma o envio da ficha quando o fluxo pedir.', section: 'JOGADOR' },
  { command: '/perfil', title: 'Perfil', description: 'Mostra o treinador e informações básicas.', section: 'JOGADOR' },
  { command: '/equipe', aliases: ['/time'], title: 'Equipe', description: 'Mostra e administra a equipe atual.', section: 'JOGADOR' },
  { command: '/colecao', aliases: ['/pokemonbox'], title: 'Coleção', description: 'Lista todos os Pokémon do jogador.', section: 'JOGADOR' },
  { command: '/box', aliases: ['/boxes'], title: 'Box', description: 'Lista os Pokémon armazenados.', section: 'JOGADOR' },
  { command: '/pokemon #1', aliases: ['/pkm #1'], title: 'Ficha do Pokémon', description: 'Abre a ficha individual pelo número da coleção ou referência aceita.', section: 'JOGADOR' },
  { command: '/inventario', aliases: ['/inv', '/mochila'], title: 'Inventário', description: 'Mostra os itens do jogador.', section: 'JOGADOR' },
  { command: '/pokedex', aliases: ['/dex'], title: 'Pokédex', description: 'Mostra registros vistos e capturados.', section: 'JOGADOR' },
  { command: '/onde', aliases: ['/local'], title: 'Localização', description: 'Mostra área atual, serviços e rotas disponíveis.', section: 'JOGADOR' },
  { command: '/ir 1', title: 'Viajar', description: 'Segue uma das rotas numeradas mostradas por /onde.', section: 'JOGADOR' },
  { command: '/encontro', title: 'Encontro', description: 'Mostra o encontro selvagem atual.', section: 'JOGADOR' },
  { command: '/batalha', title: 'Batalha', description: 'Mostra o estado do combate e as opções do turno.', section: 'JOGADOR' },
  { command: '/combate', title: 'Guia de combate', description: 'Mostra comandos e regras mecânicas de combate.', section: 'JOGADOR' },
  { command: '/movimento 2', title: 'Usar movimento', description: 'Escolhe um golpe por slot ou nome durante a batalha.', section: 'JOGADOR' },
  { command: '/trocar 2', title: 'Trocar Pokémon', description: 'Troca o Pokémon ativo pelo slot informado.', section: 'JOGADOR' },
  { command: '/capturar', title: 'Capturar', description: 'Tenta capturar o Pokémon selvagem; pode receber o nome da Poké Ball.', section: 'JOGADOR' },
  { command: '/fugir', title: 'Fugir', description: 'Tenta encerrar um encontro ou batalha PVE fugindo.', section: 'JOGADOR' },
  { command: '/desistir', title: 'Desistir do PVP', description: 'Encerra a própria participação numa batalha PVP.', section: 'JOGADOR' },
  { command: '/desafiar @jogador', title: 'Desafiar', description: 'Cria um desafio PVP para a pessoa mencionada.', section: 'JOGADOR' },
  { command: '/aceitar', title: 'Aceitar PVP', description: 'Aceita o desafio PVP pendente.', section: 'JOGADOR' },
  { command: '/recusar', title: 'Recusar PVP', description: 'Recusa o desafio PVP pendente.', section: 'JOGADOR' },
  { command: '/cancelar', title: 'Cancelar desafio', description: 'Cancela o desafio antes da resposta.', section: 'JOGADOR' },
  { command: '/golpes', aliases: ['/movimentos'], title: 'Golpes pendentes', description: 'Mostra decisões de aprendizado de movimentos.', section: 'JOGADOR' },
  { command: '/aprender 1 3', title: 'Aprender golpe', description: 'Resolve uma decisão pendente escolhendo slot 1–4 ou pular.', section: 'JOGADOR' },
  { command: '/evolucao #1', aliases: ['/evolucoes #1'], title: 'Evolução', description: 'Mostra evoluções possíveis e requisitos do Pokémon.', section: 'JOGADOR' },
  { command: '/evoluir #1 1', title: 'Evoluir', description: 'Executa uma opção de evolução disponível.', section: 'JOGADOR' },
  { command: '/pokemart', title: 'Poké Mart', description: 'Entra no fluxo da loja quando o local possui esse serviço.', section: 'JOGADOR' },
  { command: '/comprar', title: 'Comprar', description: 'Abre/continua o fluxo de compra dentro do Poké Mart.', section: 'JOGADOR' },
  { command: '/itens', title: 'Itens da loja', description: 'Mostra itens disponíveis no Poké Mart.', section: 'JOGADOR' },
  { command: '/vender', title: 'Vender', description: 'Abre/continua o fluxo de venda no Poké Mart.', section: 'JOGADOR' },
  { command: '/centropokemon', title: 'Centro Pokémon', description: 'Entra no Centro Pokémon quando disponível na área.', section: 'JOGADOR' },
  { command: '/curar', title: 'Curar', description: 'Recupera a equipe dentro do Centro Pokémon.', section: 'JOGADOR' },
  { command: '/pc', title: 'PC', description: 'Abre o PC/boxes dentro do Centro Pokémon.', section: 'JOGADOR' },
  { command: '/caixas', title: 'Caixas do PC', description: 'Mostra as caixas disponíveis durante a sessão do PC.', section: 'JOGADOR' },
  { command: '/depositar', title: 'Depositar', description: 'Move Pokémon da equipe para o PC no fluxo ativo.', section: 'JOGADOR' },
  { command: '/retirar', title: 'Retirar', description: 'Move Pokémon do PC para a equipe no fluxo ativo.', section: 'JOGADOR' },
  { command: '/organizar', title: 'Organizar PC', description: 'Abre o fluxo de organização das caixas.', section: 'JOGADOR' },
  { command: '/conversar', title: 'Conversar', description: 'Interage com o NPC do serviço quando disponível.', section: 'JOGADOR' },
  { command: '/pescar', title: 'Pescar', description: 'Inicia pesca em um ponto elegível.', section: 'JOGADOR' },
  { command: '/sair', title: 'Sair do serviço', description: 'Sai do Poké Mart, Centro Pokémon ou outro serviço ativo.', section: 'JOGADOR' },
];

const MODULES: readonly GuideModule[] = [
  {
    title: 'JOGADORES · PLAYER 360',
    href: '/admin/players',
    detail: 'Procure um treinador e abra toda a ficha operacional em um só lugar.',
    prefixes: ['player.', 'progression.', 'pokedex.'],
    steps: [
      'Abra Jogadores e pesquise pelo nome do treinador.',
      'Clique no resultado correto.',
      'Confira status, localização, equipe, inventário e atividade antes de alterar qualquer coisa.',
      'Use as ações da própria ficha; não copie identificadores técnicos para fora da Central.',
    ],
  },
  {
    title: 'POKÉMON',
    href: '/admin/players',
    detail: 'Dar Pokémon, editar dados, movimentos, treino, efeitos e roster.',
    prefixes: ['pokemon.', 'effect.', 'effects.'],
    steps: [
      'Abra o jogador pelo Player 360.',
      'Na área de Pokémon, escolha o Pokémon existente ou use Dar Pokémon.',
      'Preencha os campos humanos exibidos na tela: espécie, forma, nível, habilidade, natureza e destino.',
      'Revise o resumo de confirmação antes de aplicar.',
    ],
  },
  {
    title: 'RECOMPENSAS',
    href: '/admin/rewards',
    detail: 'Dinheiro, progressão, itens e outras recompensas em lote com preview.',
    prefixes: ['wallet.', 'inventory.', 'progression.', 'batch.', 'reward.', 'economy.'],
    steps: [
      'Escolha os jogadores ou o filtro de público.',
      'Escolha o tipo de recompensa e a quantidade.',
      'Escreva um motivo claro.',
      'Gere o preview e confira a amostra e a quantidade de alvos.',
      'Só então confirme a execução.',
    ],
  },
  {
    title: 'MUNDO E BATALHA',
    href: '/admin/players',
    detail: 'Diagnóstico e correções operacionais de encontro, batalha e estado do jogador.',
    prefixes: ['world.', 'encounter.', 'battle.'],
    steps: [
      'Abra o jogador afetado no Player 360.',
      'Confira encontro e batalha ativos antes de agir.',
      'Use as ações de suporte/correção apresentadas na ficha.',
      'Depois da correção, releia o estado e confira a atividade recente.',
    ],
  },
  {
    title: 'CONTEÚDO',
    href: '/admin/content',
    detail: 'Ciclo de draft, validação e publicação do conteúdo do RPG.',
    prefixes: ['content.'],
    steps: [
      'Selecione o release.',
      'Para mudanças de catálogo, trabalhe em DRAFT.',
      'Valide antes de publicar.',
      'Preencha o motivo administrativo sempre que a tela pedir.',
      'Se a operação exigir outro administrador, aguarde a aprovação em vez de tentar contornar.',
    ],
  },
  {
    title: 'AUDITORIA',
    href: '/admin/audit',
    detail: 'Veja quem fez o quê, quando, em qual alvo e com qual justificativa.',
    prefixes: ['audit.', 'admin_operation.'],
    steps: [
      'Use a busca por ação, administrador ou motivo.',
      'Filtre pelo estado quando investigar uma operação.',
      'Use a trilha para confirmar que uma ação realmente foi aplicada.',
    ],
  },
  {
    title: 'EQUIPE ADMINISTRATIVA',
    href: '/admin/team',
    detail: 'Adicionar administradores, Recepção e poderes individuais.',
    prefixes: ['admin.', 'admin_', 'community.'],
    ownerOnly: true,
    steps: [
      'Pesquise o treinador que entrará para a equipe.',
      'Adicione com um motivo.',
      'Marque somente os poderes necessários para a função.',
      'Use Recepção apenas para quem realmente atenderá fichas.',
      'Salve a alteração com justificativa.',
    ],
  },
];

function HiddenAdminRoute() {
  return (
    <main className="admin-page admin-page-hidden">
      <section>
        <span>404</span>
        <strong>ENDEREÇO INDISPONÍVEL</strong>
        <a href="/jornada">VOLTAR À JORNADA</a>
      </section>
    </main>
  );
}

function hasCapabilities(current: readonly string[], required: readonly string[] | undefined) {
  return required === undefined || required.every((capability) => current.includes(capability));
}

function matchesPrefixes(current: readonly string[], prefixes: readonly string[]) {
  return current.some((capability) => prefixes.some((prefix) => capability.startsWith(prefix)));
}

async function copyCommand(command: string) {
  try {
    await navigator.clipboard.writeText(command);
  } catch {
    // Clipboard can be unavailable in restricted browsers; selection remains visible.
  }
}

export function AdminGuidePage() {
  const admin = usePlayerPortalAdmin();
  const [query, setQuery] = useState('');
  const [section, setSection] = useState<'TODOS' | GuideCommand['section']>('TODOS');
  const [onlyMine, setOnlyMine] = useState(true);

  if (admin.status === 'loading') {
    return (
      <main className="admin-page">
        <header className="admin-topbar">
          <div><small>CENTRAL ADM</small><strong>MANUAL DO ADM</strong></div>
          <HubMenuTrigger />
        </header>
        <section className="admin-loading">MONTANDO SEU GUIA…</section>
      </main>
    );
  }

  if (admin.status !== 'admin') return <HiddenAdminRoute />;

  const capabilities = admin.admin.capabilities;
  const allCommands = [...ADMIN_COMMANDS, ...PLAYER_COMMANDS];

  const commands = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pt-BR');
    return allCommands.filter((entry) => {
      if (section !== 'TODOS' && entry.section !== section) return false;
      if (onlyMine && entry.section !== 'JOGADOR' && !hasCapabilities(capabilities, entry.required)) {
        return false;
      }
      if (!needle) return true;
      return [
        entry.command,
        entry.title,
        entry.description,
        entry.note ?? '',
        ...(entry.aliases ?? []),
      ].some((value) => value.toLocaleLowerCase('pt-BR').includes(needle));
    });
  }, [capabilities, onlyMine, query, section]);

  const modules = MODULES.filter((module) =>
    module.ownerOnly ? admin.admin.owner : matchesPrefixes(capabilities, module.prefixes),
  );

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div><small>CENTRAL ADM</small><strong>MANUAL DO ADM</strong></div>
        <HubMenuTrigger />
      </header>

      <section className="admin-shell admin-guide-shell">
        <div className="admin-breadcrumb">
          <a href="/admin">CENTRAL ADM</a><span>›</span><strong>MANUAL</strong>
        </div>

        <header className="admin-guide-heading">
          <div>
            <span className="admin-kicker">SEM CÓDIGO · SEM UUID · SEM JSON</span>
            <h1>Manual do administrador</h1>
            <p>
              Pesquise uma tarefa e siga o passo a passo. O guia destaca automaticamente o que
              sua conta pode usar agora.
            </p>
          </div>
          <div className="admin-guide-access">
            <span>SEU ACESSO</span>
            <strong>{capabilities.length}</strong>
            <small>poderes administrativos ativos</small>
          </div>
        </header>

        <section className="admin-guide-start">
          <article>
            <span>1</span>
            <div><strong>Entre pelo /hub</strong><small>Use o link pessoal enviado pelo bot.</small></div>
          </article>
          <article>
            <span>2</span>
            <div><strong>Abra a Central ADM</strong><small>Você só verá módulos permitidos para sua conta.</small></div>
          </article>
          <article>
            <span>3</span>
            <div><strong>Confira antes de aplicar</strong><small>Preview, alvo e motivo devem fazer sentido.</small></div>
          </article>
          <article>
            <span>4</span>
            <div><strong>Cheque a Auditoria</strong><small>Use o histórico para confirmar ações importantes.</small></div>
          </article>
        </section>

        <section className="admin-guide-section">
          <header>
            <div><span className="admin-kicker">CENTRAL ADM</span><h2>Como usar o site</h2></div>
            <small>{modules.length} módulos disponíveis para você</small>
          </header>
          <div className="admin-guide-modules">
            {modules.map((module) => (
              <article key={module.title} className="admin-guide-module">
                <div>
                  <strong>{module.title}</strong>
                  <p>{module.detail}</p>
                </div>
                <ol>
                  {module.steps.map((step) => <li key={step}>{step}</li>)}
                </ol>
                {module.href ? <a href={module.href}>ABRIR MÓDULO</a> : null}
              </article>
            ))}
          </div>
        </section>

        <section className="admin-guide-section">
          <header>
            <div><span className="admin-kicker">WHATSAPP</span><h2>Comandos do bot</h2></div>
            <small>{commands.length} comandos neste filtro</small>
          </header>

          <div className="admin-guide-tools">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar: dinheiro, ficha, batalha, inventário…"
            />
            <select
              value={section}
              onChange={(event) => setSection(event.target.value as typeof section)}
            >
              <option value="TODOS">Todas as áreas</option>
              <option value="ADM">Administração</option>
              <option value="RECEPÇÃO">Recepção</option>
              <option value="NARRAÇÃO">Narração/PVE</option>
              <option value="CONFIGURAÇÃO">Configuração/Testes</option>
              <option value="JOGADOR">Comandos de jogador</option>
            </select>
            <label>
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={(event) => setOnlyMine(event.target.checked)}
              />
              Mostrar só o que posso usar
            </label>
          </div>

          <div className="admin-guide-command-list">
            {commands.map((entry) => {
              const allowed = entry.section === 'JOGADOR' || hasCapabilities(capabilities, entry.required);
              return (
                <article key={`${entry.section}:${entry.command}`} className="admin-guide-command">
                  <header>
                    <span>{entry.section}</span>
                    <strong>{allowed ? 'DISPONÍVEL' : 'SEM ACESSO'}</strong>
                  </header>
                  <div className="admin-guide-command-body">
                    <div>
                      <h3>{entry.title}</h3>
                      <p>{entry.description}</p>
                      {entry.aliases?.length ? <small>Também aceita: {entry.aliases.join(' · ')}</small> : null}
                      {entry.note ? <small>{entry.note}</small> : null}
                    </div>
                    <div className="admin-guide-command-code">
                      <code>{entry.command}</code>
                      <button type="button" onClick={() => void copyCommand(entry.command)}>COPIAR</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="admin-guide-safety">
          <strong>REGRA SIMPLES</strong>
          <p>
            Se você não souber exatamente o que uma ação vai alterar, pare no preview. Não precisa
            entender banco, código ou identificadores internos para administrar o RPG.
          </p>
        </section>
      </section>
    </main>
  );
}
