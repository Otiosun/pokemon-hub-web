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

  it('keeps build, environment and Admin API state visible while the session is gated', () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain('BUILD local');
    expect(html).toContain('AMBIENTE DESENVOLVIMENTO');
    expect(html).toContain('ADMIN API VALIDANDO SESSÃO');
  });
});
