# Pokémon Hub Web

Companion web do RPG de Pokémon: visualização e gestão de Time, Box e Pokédex, com camada visual híbrida (3D + artwork + portraits + sprites) desacoplada do motor do RPG.

## Estado atual

Fase 1 — Fundação e Deploy.

O primeiro laboratório funcional ficará em `/asset-lab` com Bulbasaur, Charmander e Squirtle.

## Stack

- React 19
- TypeScript strict
- Vite 8
- pnpm 11
- Biome
- Vitest
- Google `<model-viewer>`
- Vercel Hobby

## Comandos

```bash
pnpm install
pnpm dev
pnpm verify
```

`pnpm verify` executa lint/format check, typecheck, testes e build de produção.

## Regras de arquitetura

- Instâncias do jogador nunca armazenam URLs externas de assets.
- Componentes de UI não conhecem provedores externos diretamente.
- Assets são resolvidos pela camada `VisualAssetSystem`.
- 3D é progressivo: a experiência precisa continuar utilizável sem WebGL ou com provedor indisponível.
- Box e Pokédex não devem abrir dezenas de contextos WebGL simultaneamente.

## Escopo atual

Somente a área Pokémon. Inventário, mapa, loja, treinador, admin, missões e batalha completa ficam fora deste subprojeto por enquanto.
