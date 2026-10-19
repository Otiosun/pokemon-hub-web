# Gate E — sessões exclusivas de staging / contrato de ativação

**Status:** PR draft de prévia. **Não ativar serviço pago nem criar usuário real de teste.** A etapa local continua pendente de aviso e autorização do operador do bot WhatsApp.

## Problema eliminado

Antes desta revisão, o painel Premium de preview consultava `usePlayerPortalAdmin()`, que lê o `/api/hub/admin/self` do Hub normal. O proxy Premium também encaminhava todo o header `Cookie` do navegador, podendo incluir o token de produção. Mesmo com assinaturas distintas, o transporte violava o isolamento desejado.

**Novo contrato, implementado em `#107`:**
- Cookie normal: `__Host-pokemon_hub_session`. Só é encaminhado ao backend normal e somente esse cookie, sem cookies externos da Vercel nem o de staging.
- Cookie staging: `__Host-pokemon_hub_premium_stage_session`. Só vai para o backend staging permitido, renomeado **no servidor** para o nome de cookie que o `PlayerPortalHttpHandler` já reconhece. O cookie normal nunca é encaminhado ao staging.
- A troca de ticket usa `POST /api/hub/admin/premium-auth/exchange`. O servidor **não encaminha cookie do navegador** ao backend na troca; aceita somente ticket de 43 caracteres, recebido por HTTPS, resgatado uma única vez pela API separada.
- O `Set-Cookie` recebido deve ser `__Host-pokemon_hub_session=<token assinado>; Path=/; HttpOnly; Secure; SameSite=Lax|Strict; Max-Age<=43200`. Vercel reescreve atributos e nome para o cookie stage com `SameSite=Strict`, `Secure`, `HttpOnly`, `Path=/`, **sem Domain**. Cookie inválido => 502 sem login reconhecido.
- A validação de dono agora é **`GET /api/hub/admin/premium-auth/self`** contra API stage; exige resposta com `admin.owner=true` e `central.view`. Jogador usa `GET /api/hub/admin/premium-auth/player`, também via stage. Não deriva permissões do admin normal de produção.
- `POST /api/hub/admin/premium-auth/logout` apaga apenas o cookie stage da prévia; deixa o cookie normal intacto.
- Mutação com `Origin` externo ou `Sec-Fetch-Site: cross-site` é rejeitada **antes** de contatar backend. O cookie de stage é `SameSite=Strict`.
- Sem backend staging aprovado, a leitura e os pedidos falham fechados em 503; sem sessão staging exclusiva, retornam 401. A interface não exibe ações comerciais sem login de staging.

## Caminho exato para teste futuro (NÃO EXECUTAR AINDA)

1. Provisionar PostgreSQL e API staging de forma **isolada do bot local/de produção** e sem gerar custos não autorizados. Não reutilizar `DATABASE_URL`, banco, roles, backup, sessão Baileys, chave de assinatura, principal owner nem fixtures reais. Não ligar worker WhatsApp.
2. Aplicar migrations no **banco descartável** e confirmar privilégios runtime/migrator, entitlements e dono sintético. Revisar especialmente o efeito de `0072` sobre `OWNER_SECURITY_ADMIN` — veja o [checkpoint local no backend](https://github.com/Otiosun/sla/blob/feat/premium-mainline-core-isolated-20261019/docs/operations/premium-local-application-checkpoint-20261019.md).
3. Backend candidato `#227`, `APP_ENV=staging` e `PREMIUM_STAGING_ENABLED=1`, **apenas em staging com credenciais próprias**. Em `production` Premium continua desabilitado.
4. Expor essa API stage via HTTPS com um host próprio; registrar explicitamente esse mesmo origin nas variáveis **somente da branch preview** `PREMIUM_STAGING_API_BASE_URL`, `PREMIUM_STAGING_APPROVED_ORIGIN` e `PREMIUM_STAGING_ENABLED=1` no Vercel. Não copiar endpoint do Player Portal normal, nem configurar no target production.
5. Emitir tickets de login de curta duração a partir **do serviço de tickets do banco staging** para um treinador sintético e um owner sintético. Os tickets não vão para Git/PR/log/chat ou localStorage e são digitados na prévia de testes.
6. Confirmar segurança dos cookies, login/logout, negativas 401/403, operação manual PENDING→PAID→APPLIED, idempotência, concorrência, duração XP2× e nenhuma influência nos jogadores reais. Navegador desktop e Android são gates adicionais.
7. Se qualquer estágio falhar, deixar flags desligadas, não promover `main`, não publicar pagamento, não tocar no bot local.

## Testes existentes

- `src/player-api/premiumStagingSessionCookies.test.ts`: não vazamento de cookie normal/stage entre APIs; troca e logout; validação de cookie; origem externa recusada; ambiente production retorna 503.
- `src/player-api/premiumStagingAuthClient.test.ts`: somente owner staging verdadeiro é autorizado; 401/503 não viram login; ticket one-time não é persistido no cliente.
- `src/player-api/premiumStagingFailClosed.test.ts`: backend Premium desabilitado não faz fallback para API normal.
- `src/features/store/Premium2XpCartCheckout.test.tsx`: ação indisponível até autenticação exclusiva.
- Backend `Otiosun/sla #227`: HTTP integrado com PostgreSQL descartável e efeitos 1×/2× restritos a XP Pokémon.

**Importante:** testes unitários/build do Vercel não substituem QA interativo real; o preview exige login da Vercel e não foi auditado visualmente pelo navegador autenticado.
