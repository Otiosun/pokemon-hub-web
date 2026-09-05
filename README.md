# Pokémon Hub Web

Companion web do RPG de Pokémon para Jornada, Pokédex, Box e Time. A camada visual combina 3D, artwork, portraits e sprites sem mover regras do RPG para o frontend.

## Superfície do jogador

Rotas atuais do produto:

- `/jornada` — perfil e registro do treinador;
- `/pokedex` — índice da Pokédex;
- `/pokedex/:dex` — registro canônico da espécie;
- `/pokemon` — Box;
- `/pokemon/:instanceId` — registro de uma instância possuída;
- `/team` — composição do Time.

`/asset-lab/*` e antigas rotas `/pokemon/demo-*` não são superfícies de produto. Labs pertencem à história de engenharia; URLs legacy conhecidas são canonizadas para a Pokédex e endereços técnicos/inválidos não devem abrir uma UI antiga.

## Stack

- React 19
- TypeScript strict
- Vite 8
- pnpm 11
- Biome
- Vitest
- Three.js

## Comandos

```bash
pnpm install
pnpm dev
pnpm verify
```

`pnpm verify` executa auditorias do pipeline 3D, lint, typecheck, testes e build de produção.

## Regras de arquitetura

- Instâncias do jogador nunca armazenam URLs externas de assets.
- Componentes de UI não conhecem provedores externos diretamente.
- Assets são resolvidos pela camada visual compartilhada.
- 3D é progressivo: a experiência precisa continuar utilizável sem WebGL ou com provedor indisponível.
- Box e Pokédex não devem abrir dezenas de contextos WebGL simultaneamente.
- Rota desconhecida deve ser explícita; nunca usar Jornada como fallback silencioso.
- Código de laboratório não pode voltar a ser rota pública por acidente.

## Política de deploy

Jogador/cliente recebe somente um alias público canônico. URLs de branch, commit ou preview são snapshots de engenharia/review e não representam a versão atual do produto. Um provedor não deve apontar para preview de branch de outro provedor por rotas diagnósticas persistentes.

## Escopo

Este repositório é o Hub web do RPG. Motor mecânico do bot, Central ADM e outras aplicações permanecem projetos separados.
