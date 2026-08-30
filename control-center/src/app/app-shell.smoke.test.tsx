import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

describe('Control Center app shell smoke', () => {
  it('fails closed behind the administrative session gate before browser authentication', () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain('POKÉMON CONTROL CENTER');
    expect(html).toContain('Validando acesso administrativo.');
    expect(html).toContain('A interface só será carregada depois que a Admin API confirmar');
    expect(html).not.toContain('FOUNDATION · SEM API');
    expect(html).not.toContain('Jogadores');
    expect(html).not.toContain('Administração');
  });
});
