import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

describe('Control Center app shell smoke', () => {
  it('renders the administrative shell without a browser runtime', () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain('Control Center');
    expect(html).toContain('O que precisa da sua atenção.');
    expect(html).toContain('FOUNDATION · SEM API');
    expect(html).toContain('Hoje');
    expect(html).toContain('Jogadores');
    expect(html).toContain('Administração');
  });
});
