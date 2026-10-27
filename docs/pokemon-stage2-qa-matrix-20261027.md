# Pokémon Beyond — Etapa 2: mapa de funcionalidade e simulações
**Atualização: 27/10/2026.** PR Hub #126 e backend #260 (Draft, dependentes de Premium #125/#259). Nenhum merge, bot, PM2, Baileys, PostgreSQL real ou deploy autorizado.

## Escopo fechado
A Etapa 2 é um bloco indivisível: evolução e regras visíveis, aprendizado/substituição/recusa de golpes, Time/Box e fichas individuais, administração de Pokémon e progressão de jogadores. Pesca pertence à Etapa 3. Jornada narrada humana preservada. Não inventar efeitos ou mexer em spawn competitivo.

**UI aprovada:** preservar a coleção, fichas com stage 2D/3D e abas, Time/Box e Player 360 já construídos; tipografias IBM Plex Mono / Space Grotesk, painéis escuros, destaques vermelhos/ciano e controles móveis tocáveis. O novo painel de evolução foi alinhado ao painel de golpes existente, sem refazer a navegação, capa, Pokédex ou menu.

## Matriz de cenários
Evidência CI significa teste isolado, não aprovação no PC real.

| Sistema | Cenários e invariantes | Estado |
| --- | --- | --- |
| Sessão | Sem login e Pokémon de outra pessoa não recebem acesso nem mutação | Backend CI; UAT visual pendente |
| Evolução GET | Catálogo do Pokémon autenticado: destino, gatilho, nível, atributos, item/saldo, condição e batalha | Backend + Hub CI |
| Evolução automática | Por nível, executada pelo motor de XP; Hub não força a evolução manualmente | Backend + Hub CI |
| Evolução por item | Apenas opção do catálogo e item disponível; confirmação, consumo e regra autoritativos | Unidade e serviço CI; PG específico pendente |
| Evolução por condição | Flag ativa/inativa, servidor valida em POST | Unidade/cliente CI |
| Evolução ambígua | Dois destinos compartilhando gatilho não podem ser distinguidos no contrato atual; UI bloqueia | Hub CI |
| Evolução erro | ID inválido, conta inativa, batalha, resposta incerta, pedido duplicado | Backend/cliente CI; replay PG específico pendente |
| Golpes | Pendências, aprender, substituir slot 1–4, recusar, bloqueio em batalha | Backend/Hub CI |
| Golpes duplicados | Duas ofertas concorrentes do mesmo golpe não apagam outro golpe nem duplicam slot | PostgreSQL CI |
| Golpes obsoletos | Decisão já atendida: cliente informa e relê pendências | Hub CI |
| Time e Box | Slots 1–6 e 1–30, swaps atômicos, entrada de Box no Time | PostgreSQL CI |
| Último membro | Não retirar único Pokémon ativo para Box vazia | PostgreSQL CI |
| Batalha ativa | Time/Box não reorganizáveis via Hub; HTTP 409 distinguido da rede | Backend/Hub CI |
| Rede instável | Posição pode ter sido alterada: reler roster, limpar undo inseguro | Código/Hub CI |
| Ficha | Dados, IVs, movimentos, status, imagens e fallback preservados | Contratos existentes; UAT visual pendente |
| ADM concessão | Permissão específica, revisão, motivo, confirmação e auditoria | Workflow CI; DB admin pendente |
| ADM efeitos | Aplicar e remover com revision e chave de retry preservada | Hub CI; DB admin pendente |
| ADM dados | Roster, nível/XP, HP, status, arquivo; Box 1–30 | Hub CI; UAT pendente |
| ADM aprovação | Não simular a aprovação de outro administrador como se fosse automática | Workflow CI |
| Premium e narrativa | Não quebrar módulos anteriores | Regressão backend CI |

## Defeitos concretos corrigidos
1. ADM: requestId novo após perda de resposta podia levar à repetição de entrega/efeito. Agora guarda payload e chave; se operador alterar dados com intenção ainda aberta, bloqueia. **Atenção:** refs de navegador ainda se perdem após recarga; reconciliação persistida por auditoria fica pendente.
2. Evolução: lista genérica de qualquer item dava impressão falsa de compatibilidade. Agora o GET do catálogo lista somente regras da espécie e saldo dos itens.
3. Evolução: opções ramificadas com mesmo trigger davam o mesmo valor no select, sem identificar destino. Agora impedidas até contrato canônico aceitar identificador de regra.
4. Evolução: botão manual de LEVEL contradizia evolução automática ao obter XP. UI e serviço recusam o manual.
5. Time/Box: falha de rede gerava mensagem incorreta de que nenhuma troca ocorreu. Agora estado incerto, tentativa de ressincronizar e não disponibilizar undo de estado desconhecido.
6. Time/Box: permitia troca durante batalha; serviço agora bloqueia e devolve FLOW_BLOCKED (409).
7. ADM: slots 31+ eram aceitos nos formulários apesar do limite real de 30; validação antes de envio.

## Provas isoladas rastreáveis
- PostgreSQL descartável Stage 2: https://github.com/Otiosun/sla/actions/runs/40566253154 — duas jobs SUCCESS, migração e invariantes de Time/Box e golpes.
- Backend narrativa/sem regressão: https://github.com/Otiosun/sla/actions/runs/40566258983 e Premium https://github.com/Otiosun/sla/actions/runs/40566259010 — SUCCESS.
- Hub: https://github.com/Otiosun/pokemon-hub-web/actions/runs/40566351252 — SUCCESS em typecheck/lint/testes direcionados. Revisões posteriores exigem CI próprio antes de afirmar que passaram.
- Backend Stage2, evolução, HTTP e build: https://github.com/Otiosun/sla/actions/runs/40566253154 — SUCCESS.

## Gaps honestamente abertos
- Construir prova específica de evolução ITEM/CONDITION + consumo/replay/rollback transacional em PostgreSQL (os testes existentes de Stage2 PG focam Box/golpes).
- Staging isolado com sessões de proprietário, ADM autorizado e jogador para UAT desktop e mobile 360/390px; não apontar a serviços do jogo ativo.
- Evoluções alternativas com mesmo gatilho precisam de nova identidade de regra no domínio antes de oferecer escolha de destino. Preservar bloqueio até lá.
- Reconciliação da auditoria ADM após recarga de página; refs locais não persistem.
- Concorrência de início de combate enquanto o banco está movimentando roster (a checagem de batalha ocorre antes da transação).
- Exercitar em conjunto no runtime sintético os quatro comandos WhatsApp existentes: /evolucao, /evoluir, /golpes, /aprender e as rotas equivalentes do Hub.
- Prova combinada real frontend BFF + backend Stage2 + PG isolado e revisão visual das telas. Nenhuma dessas provas deve ser confundida com produção.

## Aceite final
Só encerrar Etapa 2 após regressões, permissões e invariantes verdes, UAT de acessibilidade e interface preservada, integração das duas PRs com a Etapa 1 e autorização explícita para merge/deploy. Não realizar mudanças LIVE neste trabalho.
