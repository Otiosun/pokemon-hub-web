# Pokémon Beyond Hub — UAT humano v1

Candidato frontend: PR #38 / `integration/hub-frontend-v1`.

Preview:
`https://pokemon-hub-web-git-integr-fb77f8-bellcranel1921-4681s-projects.vercel.app`

## Regra de aceite

O Hub consulta e organiza; o gameplay continua no WhatsApp. Nenhum fluxo abaixo deve oferecer viagem, encounter, batalha ou captura pelo site.

## A. UAT visual público / showcase

Use `?showcase=advanced` quando precisar preencher superfícies sem depender de sessão real.

### Navegação global
- Abrir MENU em Jornada, Pokédex, Box e Store.
- Fechar por X, backdrop e Escape.
- Em mobile, botão não deve ficar espremido nem cobrir conteúdo importante.
- Voltar do navegador deve fechar o menu quando ele foi a última ação.
- Os destinos devem continuar Jornada · Pokédex · Box · Champion Store.

### Jornada
- Conferir nome, título, origem, localização, parceiro e progresso.
- Textos longos não devem romper a licença/card.
- Blocos sem dado real não devem fingir informação.
- Modal/cartão compartilhável deve caber em tela estreita e fechar facilmente.
- Sem controles de viagem.

### Pokédex
- Busca por nome e número.
- Filtros: região, descoberta, shiny e tipo.
- Abrir espécie e navegar anterior/próxima.
- Voltar ao índice preservando contexto razoável.
- Menu não deve colidir com contador/header em mobile.

### Box / Time
- Time e armazenamento legíveis em 360–430 px.
- Abrir Team e voltar.
- Abrir Pokémon individual e voltar à origem correta.
- Filtros/organização não devem provocar overflow horizontal.

### Detalhe Pokémon
- Alternar 2D ↔ 3D.
- Anterior/próximo.
- Abas e histórico.
- Controles superiores precisam continuar tocáveis em mobile.
- Nenhuma ação de batalha/captura.

### Champion Store
- Tema roxo quase neon consistente.
- Imagens do documento carregam e mantêm proporção.
- Sequência texto → imagem → texto da introdução preservada.
- Os 10 produtos aparecem.
- Preços mantêm apresentação consistente e não estouram cards estreitos.
- Ovo exibe as três variantes.
- Não existe checkout, botão de compra nem concessão automática.

## B. UAT autenticado real

Só executar quando o backend do item 5 estiver publicado.

Pré-requisitos do backend atual:
- migration `0042_hub_login_tickets.sql` aplicada;
- `HUB_PUBLIC_URL` apontando para o Hub;
- `PLAYER_PORTAL_SESSION_SIGNING_KEY_BASE64` configurada;
- processo Player API iniciado por `pnpm start:player-portal:prod`.

Fluxo:
1. No WhatsApp, enviar `/hub`.
2. Abrir o link recebido.
3. Confirmar login sem pedir credencial manual.
4. Atualizar/reabrir a página e confirmar persistência da sessão.
5. Jornada: localização deve vir do World real.
6. Box: Pokémon possuídos devem ser os do jogador.
7. Mover Pokémon Team ↔ Box e confirmar persistência após reload.
8. Pokédex: vistos/capturados devem refletir o jogador.
9. Abrir Pokémon possuído e validar detalhe.
10. Confirmar que World/Travel/Encounter/Battle/Capture não aparecem como ações web.
11. Tentar reutilizar o ticket original: deve falhar; o ticket é one-shot.
12. Abrir o Hub com sessão válida por outra rota e confirmar que o jogador nunca consegue acessar dados de outro player.

## Matriz mobile mínima

Testar em 360×800, 390×844 e 430×932. Além disso, uma passada desktop em 1366×768.

## Fechamento

O item 8 só fecha quando:
- UAT visual não tiver defeito bloqueante;
- fluxo autenticado real estiver comprovado;
- Team ↔ Box persistir;
- localização autoritativa aparecer;
- nenhum gameplay web escapar da fronteira do companion.
