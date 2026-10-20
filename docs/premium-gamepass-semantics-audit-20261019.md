# Pokémon Beyond — auditoria de semântica dos gamepasses (Gate F; 19/10/2026)

**Objetivo:** impedir que a Central ADM prometa entregar um gamepass quando só executa uma operação genérica de inventário/Pokémon. Este documento é de engenharia; não confirma compra, entrega nem altera preços.

## Fontes verificadas

1. Documento existente no Google Drive **GAMEPASS — POKÉMON BEYOND (TEMPORÁRIO)**: https://docs.google.com/document/d/16rThLDpgUGx6vSpcicNLf4bF265_p9_P2Pp73hRT8ko/edit
2. Catálogo efetivamente exposto na web: `src/features/store/championStoreCatalog.ts` (23 produtos, variantes de ovo).
3. Backend real de testes: `Otiosun/sla` PR #229 — somente `2XP` tem executor por entitlement; agora há ferramentas owner-only de entrega **avulsa de itens e Pokémon**, que não representam pacotes inteiros.

## Ações agora disponíveis na Central

- **ENTREGAS:** benefício temporário XP 2× por sete dias/unidade, operador e motivo auditados.
- **ITENS:** adição individual de item *publicado no catálogo ativo* via `inventory.adjust`, operação administrativa com idempotência e histórico de auditoria. Não cria uma receita de pack.
- **POKÉMON:** criação individual a partir de forma publicada via `pokemon.create`, com nível, opção Shiny e confirmação de operação, sem atribuir qualquer SKU comercial. Não representa ovo ou Pokémon Gênesis.
- **GAMEPASSES:** 23 itens visíveis com status honesto do executor; sem botão de concessão falso.
- **ATENDIMENTOS:** histórico de suporte persistente e editável somente por anexos (append-only).

## Gamepasses com semântica que impede automação ingênua

| SKU | Conteúdo do documento temporário | Implicação |
| --- | --- | --- |
| `TERA` | Acesso à mecânica Terastalização, tipo individual e uso em combate | Só liberar após haver habilitação da mecânica + regras de tipo no sistema |
| `Z` | Z-Moves oficiais ou proposta de movimento original sujeita a análise e balanceamento | Requer aprovação de conteúdo e executor de batalha, não item no inventário |
| `GMAX` | Acesso permanente à mecânica Gigantamax do personagem, aplicado a Pokémon | Requer implementação de acesso permanente e uso em batalha |
| `LUCK` | Sorte de captura 2× permanente | A loja atualmente marca produto indisponível; **não** confundir com XP 2× nem ativar sem lógica de captura |
| `SAVE+` | Preservação de progresso e retorno sob regras do Save | Não criar um Pokémon ou registro vazio e declarar save entregue |
| `GEN` | **Direito de criar uma espécie Pokémon original**, nome, aparência, tipos, habilidades e linha evolutiva até três estágios | **Não é** `pokemon.create` de uma espécie existente; exige workflow editorial/validação/publicação de conteúdo |
| `GYM` | Direito condicionado à aprovação para exercer cargo de líder e construir ginásio | Exige aprovação administrativa; não é badge genérico |
| `RED` | Pokémon selecionados da jornada de Red em nível inicial + conteúdos/recursos exclusivos do Save | Documento não enumera exatamente quais Pokémon/itens; não inventar receitas |
| `EGG:COMUM`, `EGG:RARO`, `EGG:ESPECIAL` | Ovos com raridades, espécies possíveis e eclosão após cuidado/distância | Não criar diretamente Pokémon como substituto do ovo/incubação |
| `2XP` | 7 dias de XP 2× nas atividades elegíveis | Backend candidato implementa apenas **XP Pokémon obtido em batalha automática**. Revisar promessa mais ampla no documento antes da publicação |

## Divergências de preço que exigem revisão humana separada

O documento é explicitamente **TEMPORÁRIO** e pode estar desatualizado. Não corrigir a loja silenciosamente nem confundir preços com autorização de concessão.

| Produto | Documento temporário | Site atual |
| --- | ---: | ---: |
| Movimento Z | R$ 40 | R$ 30 |
| Gigantamax | R$ 60 | R$ 50 |
| Bênção da Sorte | R$ 60 | R$ 45, indisponível |
| Save Premium | R$ 45 | R$ 35 |

Demais exemplos verificados coincidentes: TERA R$ 50, GEN R$ 60, GYM R$ 100, RED R$ 60, ovos Comum/Raro/Especial R$ 20/30/45 e XP 2× R$ 40.

**A política canônica atual do usuário é que bot/site NÃO confirmem pagamentos.** O proprietário confere fora do sistema. Eventuais divergências de preço são assunto da página da loja, não do backend de entrega.

## Gate para implementar cada pacote restante

1. Obter uma definição completa e aprovada dos benefícios exatos e suas variantes (sem adivinhar).
2. Provar executor existente no bot, ou implementar um com contrato, estado, idempotência, auditoria e rollback; para novos sistemas, testar interação com gameplay real.
3. Publicar SKU somente quando o servidor conseguir validar e aplicar *todos* os componentes. Parcelar em ações avulsas não é entrega atômica de pack.
4. Implementar atendimento assistido para SKU sem executor, sem marcar status `ENTREGUE` até conclusão efetiva.
5. Testes com PostgreSQL descartável, permissão owner, retry e limite de quantidade; depois staging autenticado isolado. Não tocar no computador do bot sem aviso explícito e aprovação.

**Bloqueios atuais:** nenhum pack multi-item automatizado; nenhum ovo/incubação ou espécie Gênesis criada neste Gate; staging hospedado com banco/sessão sintéticos ainda não conectado.
