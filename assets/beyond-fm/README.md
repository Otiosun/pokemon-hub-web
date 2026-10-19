# Beyond FM — hospedagem das cinco músicas

**Atenção:** use somente esta branch de desenvolvimento. Não faça merge com a `main`.

## Upload pelo celular

O GitHub pode falhar ao processar o ZIP completo de 20,8 MB. Para evitar esse erro, envie estes **quatro arquivos menores**, um por vez, para `assets/beyond-fm/`:

- `Beyond_FM_Parte_1_de_4.part` — 5.195.162 bytes
- `Beyond_FM_Parte_2_de_4.part` — 5.195.162 bytes
- `Beyond_FM_Parte_3_de_4.part` — 5.195.162 bytes
- `Beyond_FM_Parte_4_de_4.part` — 5.195.161 bytes

Cada arquivo é um pedaço BINÁRIO do ZIP original: **não renomeie, não extraia e não edite**. Pode confirmar um commit para cada upload. O build aguarda enquanto houver menos de quatro partes; com todas as partes presentes, recompõe e valida o ZIP original pelo SHA-256:

`74dd36e6e79bd78db24f8fb0f38a3771265d413421c0cafa884c6bc2c13fb609`

O método anterior (upload direto de `Beyond_FM_4_Faixas_Alola_Nova.zip`) continua compatível, mas não é necessário.

## Resultado esperado

O build confere exatamente as quatro faixas (Cynthia, National Park, Driftveil City e Alola nova), os CRCs e os tamanhos, e extrai quatro MP3 para `public/beyond-fm/` com manifesto contendo SHA-256. A quinta música é Town Theme (CC0). Com o manifesto válido, qualquer navegador pode carregar a lista de cinco músicas automaticamente, sem IndexedDB e sem botão público de upload.

**Direitos autorais:** repositório privado não torna os MP3 servidos no site privados. Antes de publicar em produção é necessário garantir autorização de redistribuição das quatro gravações.
