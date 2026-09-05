# Product Integrity Cleanup V1

Status: implementation da fatia em validação externa. Não aprovar merge/release sem os gates finais abaixo.

## Objetivo

Fazer existir uma única superfície player-facing perceptível do Pokémon Hub antes de retomar polimento ou novas features.

## Implementado nesta fatia

- rotas legacy conhecidas `/pokemon/demo-*` são canonizadas para `/pokedex/:dex`;
- demos desconhecidas, `/asset-lab/*`, Pokédex inválida e URLs arbitrárias deixam de cair silenciosamente em Jornada;
- Asset Lab, Generations Lab, viewer spike antigo, Field Dex player-facing antigo, mocks e CSS mortos foram removidos;
- a engine 3D moderna compartilhada foi preservada porque Pokédex e Pokémon possuído ainda a utilizam;
- fallback de lazy route só se revela após 160 ms, evitando micro-flash em cargas curtas;
- preload classifica Jornada, índice Pokédex, espécie, Box, Pokémon possuído e Time e aquece a rota exata por intenção do usuário;
- navegação SPA usa `startTransition`, preservando a tela atual enquanto o próximo lazy chunk carrega;
- a Vercel deixou de expor `/__cloudflare-probe` apontando para uma branch antiga do Cloudflare;
- `public/deploy-probe-v3.txt`, artefato histórico de diagnóstico, foi removido;
- regressões automatizadas protegem integridade de rotas, preload e acoplamento de deploy.

## Evidência disponível

- RED/green de integridade de rota registrado durante a implementação;
- RED/green de preload registrado durante a implementação;
- 20/20 asserções independentes passaram sobre o resolver/preloader do HEAD auditado;
- 3/3 asserções independentes passaram sobre o `vercel.json` saneado;
- build Vercel anterior passou antes do limite diário; o status atual da Vercel está bloqueado por quota de deployments, não deve ser tratado como prova do HEAD atual.

## Gates obrigatórios antes de aprovação

- build/deploy do HEAD final bem-sucedido em ambiente externo;
- smoke de `/jornada`, `/pokedex`, `/pokedex/:dex`, `/pokemon`, `/pokemon/:instanceId` e `/team`;
- smoke de URLs legacy, técnicas e inválidas;
- reload direto, cache frio/quente e Back/Forward;
- verificação real em 320, 360, 390 e 430 px;
- nenhuma interface legacy, lab técnico ou frame intermediário indevido capturável;
- confirmar e registrar o alias público canônico entregue a jogador/cliente.

## Regra de deploy

Somente o alias canônico representa o produto atual. URLs de branch/commit preview são snapshots de engenharia e não devem ser distribuídas como link do jogador.

Esta branch continua isolada da `main` e deve permanecer DRAFT até a aceitação final.
