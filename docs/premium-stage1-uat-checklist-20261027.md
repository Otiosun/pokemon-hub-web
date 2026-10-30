# Pokémon Beyond — Homologação da Central ADM / Gamepasses (Etapa 1)

**Estado: NÃO HOMOLOGADO por operador.** PR web [#125](https://github.com/Otiosun/pokemon-hub-web/pull/125) e backend [#259](https://github.com/Otiosun/sla/pull/259) permanecem em Draft. Este roteiro NÃO autoriza merge, publicação, migrações em produção, concessões reais ou pagamentos.

## Evidência automatizada já disponível

- Backend #259 `7a1749c4ac0ddb8939ffecea77627766c2348f77`: [Integration Proof 40526116788](https://github.com/Otiosun/sla/actions/runs/40526116788) — **41 testes PASS**, incluindo rotas HTTP reais e PostgreSQL descartável.
- Hub+BFF+backend: [Cross-Repo Acceptance 40527910250](https://github.com/Otiosun/pokemon-hub-web/actions/runs/40527910250) — **PASS**, usando `synthetic-api.invalid`, PostgreSQL descartável e contas fictícias. Não comprova que o PC ou site de produção estejam atualizados.
- O teste sintético da UI de cliente em `src/player-api/premiumDeliveryJourney.integration.test.ts` — **3 cenários PASS**.
- Validações de navegador e CI globais são rastreadas na [PR #125](https://github.com/Otiosun/pokemon-hub-web/pull/125) e na [issue #124](https://github.com/Otiosun/pokemon-hub-web/issues/124). Exigir resultados conclusivos do HEAD final.

## Preparação obrigatória, **fora da produção**

1. Confirmar qual commit/branch do Player Portal roda no PC. Registrar SHA verificado e versão de migrations **sem mexer em PM2, Baileys ou banco LIVE**. Caso desconhecido, escrever **PENDENTE**.
2. Preparar uma instância de **staging isolada**, com banco PostgreSQL descartável, domínio/HTTPS autorizado, cookies de sessão exclusivos e **sem credenciais reais, sem números WhatsApp reais e sem integração de checkout**.
3. Executar o Hub a partir do SHA da PR web e a API a partir do SHA da PR backend, ambos no mesmo staging; confirmar via logs locais/CI o SHA exato e a ausência de endpoints de produção.
4. Usar **três identidades sintéticas**: (A) proprietário `central.view` com `owner=true`, (B) delegado `central.view` + `premium.delivery.grant` + `player.read`, (C) ADM comum sem `premium.delivery.grant`, além de um jogador sem acesso de ADM. Verificar que a permissão delegada é emitida no servidor, jamais simulada apenas pelo navegador.
5. Criar treinador fictício em staging e manter anotado seu Player ID. NÃO usar jogador real.

## Cenários de aceitação do operador

| Cenário | Ação em staging isolado | Aceite obrigatório |
| --- | --- | --- |
| Sessão ausente | Abrir Central/entrega sem cookie válido | 401, acesso não concedido, nenhuma gravação |
| ADM comum | Tentar abrir Entregas e chamar diretamente o POST | 403, nenhuma gravação |
| Delegado autorizado | Abrir aba Entregas e buscar treinador fictício | Ver apenas rotas delegadas; jogador pesquisável somente com `player.read` |
| Owner | Abrir Central ADM | Acesso proprietário sem liberar rotas de financeiro/casos ao delegado |
| Catálogo | Abrir dropdown de produto | Apenas executores publicados: 2XP e LUCK; demais atendimentos humanos não viram concessão automática |
| 2XP | Conceder quantidade 2 com justificativa de 8–400 caracteres e confirmação explícita | 14 dias de `XP_2X`; histórico registra ator, destinatário, quantidade e `requestId` |
| Replay | Reenviar **mesmo** `requestId` e payload pelo cliente/API de teste | Sem concessão duplicada, resposta `replayed=true`, histórico com **um** lançamento |
| Conflito | Repetir `requestId` com quantidade diferente | 409; nenhum segundo grant |
| LUCK | Conceder quantidade 1 ao jogador fictício | `CAPTURE_LUCK_2X` permanente, sem expiração e histórico correto |
| Limite | Tentar LUCK quantidade 2 ou SKU não publicado | Sem benefício, erro explícito; não inventar produto |
| Falha de rede | Cortar resposta de um POST isolado **depois** do processamento e repetir com mesmo `requestId` | Operador recebe aviso de incerteza, confere histórico, retry sem duplicação |
| Segundo pedido | Em staging, fazer outra concessão com `requestId` diferente | Novo lançamento somente após nova intenção confirmada |
| Segurança | Delegado tenta `cases`, `orders`, `entitlements`, `pokemon`, `inventory` e rotas financeiras | Bloqueio pelo servidor; nenhum efeito colateral |
| Pagamentos | Executar concessões sintéticas acima | **Zero** aprovação, criação de pagamento, pedido pago ou reconciliação automática |
| Sessão revogada | Expirar/revogar sessão de staging, repetir chamada | 401/403, nunca voltar 200 |
| Auditoria | Reabrir Central, consultar histórico do jogador | Reconstituição consistente do que foi realmente escrito no banco descartável |

**Atenção:** não se deve repetir pedidos reais para testar idempotência. Use exclusivamente contas e banco descartáveis.

## Gate de fechamento da Etapa 1

Marcar a etapa concluída **somente** se: (1) CI HEAD final verde; (2) homologação da interface acima com evidências de staging e ator responsável; (3) ambiente e runtime PC confirmados; (4) divergência comercial do LUCK — **R$ 45 no catálogo vs R$ 60 em documento** — for resolvida pelo proprietário ou a oferta permanecer explicitamente não publicada; (5) documentação e PRs atualizadas.

**Mesmo após homologação:** merge, deploy/cutover, pagamento real e migração LIVE são mudanças separadas que exigem autorização explícita. Ao concluir a Etapa 1, iniciar a Etapa 2 em bloco único (evolução, golpes, equipe/Box e ações administrativas); depois Etapa 3 (Pesca). Spawn competitivo fica fora.
