# Gate E — Premium staging (19/10/2026)

## Escopo implementado
- Checkout `POST /api/hub/player/premium/orders` e endpoints owner `/api/hub/admin/premium*` têm rotas **explicitamente allowlisted**.
- Essas rotas usam `readPremiumStagingApiBaseUrl()`, **nunca** `readPlayerPortalApiBaseUrl()` como fallback.
- A rota pública pré-existente `GET /api/hub/player/battle` continua encaminhada pelo upstream habitual. Outros endpoints existentes não mudam.
- Se não houver staging habilitado e aprovado, o proxy retorna **503**, sem request ao backend.
- Não existe interface Premium liberada, pedido/checkout novo visível, cobrança nem concessão de XP em produção por esta PR.

## Ativação SOMENTE em Vercel Preview (não configurar ainda)
Todas as condições devem valer simultaneamente:

- `VERCEL_ENV=preview` (fornecido pela Vercel);
- `PREMIUM_STAGING_ENABLED=1` apenas na branch de preview explicitamente escolhida;
- `PREMIUM_STAGING_API_BASE_URL=https://<api-staging-host>`;
- `PREMIUM_STAGING_APPROVED_ORIGIN=https://<mesmo-api-staging-host>`;
- host HTTPS sem usuário, senha, query, fragmento, path, porta arbitrária ou IP privado;
- origem diferente de `PLAYER_PORTAL_API_BASE_URL` (normal Hub) e nunca `pokemon-api.otiosunbots.xyz`.

Sem uma **API backend staging separada e conferida**, não habilitar a flag. Não passar credenciais do bot ou PostgreSQL de produção a preview.

## Dependências e blockers
1. Backend #225 e #226 são drafts sobre base histórica. A base `Otiosun/sla main` contém migrações só até 0062; Premium requer 0073–0076 e serviços/ports/progressão de commits intermediários.
2. #226 passou testes de migração+XP2X+owner HTTP em banco descartável GitHub Actions; não é staging hospedado.
3. Railway `wonderful-creativity / staging` existe, mas os últimos deployments das APIs registradas estão FAILED e nenhum PostgreSQL aparece como serviço/volume do ambiente. Não reutilizar sem prova de isolamento e reset seguro.
4. Ainda faltam: revisão da cadeia completa de dependências, backend staging com DB próprio, conta owner sintética, credenciais restritas, preview UI #98 portada seletivamente, UAT e avaliação de direitos do Beyond FM.
5. Não fazer merge/cutover/rollback sem gates e autorização; **nenhuma migração nem bot WhatsApp live**.

## Contrato de pedido
- Criação PENDING não equivale a cobrança nem aprovação.
- Owner aprova pagamento separadamente da entrega; trilha de suporte não é evento financeiro.
- Servidor valida SKU `2XP`, BRL 4000, quantidades 1–52, 7 dias/unidade, 2× somente XP Pokémon elegível.
- Retentativas usam request ID estável em falhas incertas; novo ID após pedido confirmado; a PR #98 já possui `completeCheckoutIntent`, ainda não integrada.
