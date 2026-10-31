# Release 1 — Preview isolado e homologação Premium autenticada
Data: 30/10/2026. Estado: **NO-GO**. Não executar concessões reais ou ativação em produção.

## Achado de Vercel (metadados verificados, leitura apenas)

- Projeto: `pokemon-hub-web` (Hobby), Preview protegido por Vercel Authentication; Vercel reporta SSO `all_except_custom_domains`.
- Projeto Vercel contém `PLAYER_PORTAL_API_BASE_URL` com alvo **Production**; o upstream de produção permanece disponível ao site publicado.
- `vercel.json` do candidato #129 declarava a mesma variável no campo `env`, que se aplica a todas as funções de todos os deployments, incluindo Preview. Esse fallback amplo era incompatível com o requisito de Preview isolado.
- Não existem `PREMIUM_STAGING_ENABLED`, `PREMIUM_STAGING_API_BASE_URL`, `PREMIUM_STAGING_APPROVED_ORIGIN` no inventário do projeto. `VITE_PREMIUM_STAGING_UI` e `VITE_PREMIUM_STAGING_TARGET` só constam em duas branches antigas de 19/10 — não na branch do PR #129.
- O HEAD do Hub #129 (`868c068280542f98170a138d8773cd5d73d79ff1`) não tinha Preview READY no filtro exato de deploy SHA durante esta inspeção. Um Preview READY de um commit anterior não comprova a árvore final.
- As alterações deste PR removem apenas o `env` global do `vercel.json`, mantendo as regras de rewrite, cabeçalhos, CSP, UI e o backend de produção configurado pela **Project Setting Production**. Não criam servidor, database, tokens, usuários ou permissões.

## Pré-requisitos para habilitar staging REAL (não realizados)

1. Dispor de API HTTPS **independente** da API do bot ativo e de PostgreSQL 18 descartável/isolado, com conteúdo `PUBLISHED` e autenticação Hub sintética. Nunca usar o banco live nem compartilhar um ticket `/hub` de produção.
2. Confirmar o backend staging, origin HTTPS exato, health/readiness, independência do ambiente live, logs sem credenciais e capacidade de reset. Não aceitar hostname igual ao production upstream.
3. Em **Preview da branch candidata**, configurar `VITE_PREMIUM_STAGING_UI=1` e `VITE_PREMIUM_STAGING_TARGET=preview`. Na função serverless do mesmo Preview, configurar `PREMIUM_STAGING_ENABLED=1`, `PREMIUM_STAGING_API_BASE_URL` e `PREMIUM_STAGING_APPROVED_ORIGIN` com o MESMO origin HTTPS staging aprovado. Esses nomes são os contratos de código, não um convite para apontar a produção.
4. Exigir um Preview **READY** do SHA exato que inclua os testes deste PR, sem confundir commit de workflows com commit implantado. Proteção da Vercel deve permanecer ativa.
5. Fazer smoke **sem sessão**: `GET /api/hub/admin/premium-auth/self` deve ser 401 quando a API staging está de pé; 503/404 significam indisponível e bloqueiam UAT. Não transformar resposta 503 em sucesso. Checar 403 para papel sem `premium.delivery.grant` no próprio backend.
6. Usar apenas identidades sintéticas de **owner**, **ADM delegado (central.view + premium.delivery.grant)**, **ADM comum** e **treinador**. Garantir que `player.read` é requisito separado para busca de destinatário do delegado. Não anotar tickets ou cookies.
7. Validar pedidos de 2XP e LUCK com `requestId` e destinatário sintéticos, auditando ledger no banco staging; reenvio de mesmo requestId deve replay, timeout incerto deve bloquear troca de destinatário/SKU, nenhum pagamento confirmado automaticamente. Casos humanos e demais gamepasses só onde o executor existir.
8. Repetir UX em desktop e Android/iOS/Web para as rotas aprovadas, com registros sem dados privados. Depois inventário Windows real, backup+restore Baileys e PostgreSQL, rollback e GO explícito antes de qualquer cutover.

## Critério de interpretação

- Testes `vitest` e a prova Hub+Bot PG18/Chrome **aprovam somente código isolado**, não Preview autenticado.
- Metadados Vercel e Preview READY **não provam** login owner, concessão, ledger ou estabilidade do bot.
- Qualquer ausência/mismatch de ambiente, autorização ou origem: **NO-GO** com falha fechada.
- Com `vercel.json` sem `env` global, Preview que não tenha API configurada por alvo **não deve acessar a API live como fallback**.
- Nenhuma mudança de configuração Vercel, alias, PM2, banco ou git main foi efetuada nesta alteração.

## Fechamento de segurança adicional — proxy normal do Hub

O teste inicial do PR #130 cobria somente o Preview Premium e o `vercel.json`. A mesma auditoria identificou que `readPlayerPortalApiBaseUrl()` podia devolver `PLAYER_PORTAL_API_BASE_URL` também em Preview se um operador ampliasse acidentalmente o alvo dessa variável.

Na branch Draft, **todos** os endpoints normais de Hub passam a usar, durante `VERCEL_ENV=preview`, somente o origin HTTPS validado pela mesma configuração isolada `PREMIUM_STAGING_ENABLED=1`, `PREMIUM_STAGING_API_BASE_URL` e `PREMIUM_STAGING_APPROVED_ORIGIN`; na ausência desses parâmetros, respondem `503 PLAYER_PORTAL_UNAVAILABLE` sem chamar o jogo. Em `VERCEL_ENV=production`, permanece o endereço `PLAYER_PORTAL_API_BASE_URL` definido somente em Project Settings Production.

O escopo da sessão continua separado: endpoints normais usam o cookie normal emitido pelo backend **staging**, enquanto os endpoints Premium Preview exigem o cookie específico de staging. O uso do mesmo backend isolado não mescla identidades, concessões nem tickets.

Os testes exercitam o handler HTTP real `/api/hub/admin/self`, com `fetch` interceptado e nenhuma rede externa: (a) origin live injetado indevidamente não é acessado e retorna 503; (b) staging HTTPS aprovado é o único destinatário; (c) fluxo Production mantém o endereço cadastrado, mas não é chamado no teste. Falta validar login real e ledger em infraestrutura staging independente. Nenhuma variável foi editada na Vercel.
