# Beyond FM — pacote único para o servidor

Coloque aqui **somente** o ZIP chamado `Beyond_FM_4_Faixas_Alola_Nova.zip` na branch `feat/beyond-fm-hosted-archive-20261018`.

O build verifica que há exatamente quatro MP3s (incluindo a Alola substituída), testa os CRCs e os tamanhos, extrai em `public/beyond-fm` e cria `manifest.json`. A quinta música, Town Theme CC0, continua hospedada na sua fonte pública. Se não houver ZIP válido, o player usa o modo de compatibilidade sem afirmar que o servidor tem todas as faixas.

**Direitos autorais:** embora este repositório seja privado, depois do deploy os quatro endereços de áudio se tornam públicos. Antes de publicar é necessário ter autorização para disponibilizá-los.
