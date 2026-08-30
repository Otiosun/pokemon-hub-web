import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const appPath = fileURLToPath(new URL('../App.tsx', import.meta.url));
const sessionGatePath = fileURLToPath(
  new URL('../components/shell/SessionGate.tsx', import.meta.url),
);
const diagnosticsPath = fileURLToPath(
  new URL('../components/shell/OperationalDiagnostics.tsx', import.meta.url),
);
const shellCssPath = fileURLToPath(new URL('../components/shell/shell.css', import.meta.url));

describe('Control Center environment visibility contract', () => {
  it('keeps environment visible before and after administrative session validation', async () => {
    const [app, sessionGate, diagnostics, shellCss] = await Promise.all([
      readFile(appPath, 'utf8'),
      readFile(sessionGatePath, 'utf8'),
      readFile(diagnosticsPath, 'utf8'),
      readFile(shellCssPath, 'utf8'),
    ]);

    expect(sessionGate).toContain('environment={config.environment}');
    expect(sessionGate).toContain('{diagnostics}');
    expect(app).toContain('environment={session.environment}');
    expect(app).toContain('<OperationalDiagnostics');
    expect(diagnostics).toContain('<span>AMBIENTE {environmentLabel(environment)}</span>');
    expect(shellCss).toContain('@media (max-width: 720px)');
    expect(shellCss).toContain('.operational-diagnostics.is-inline');
    expect(shellCss).not.toContain('.operational-diagnostics {\n    display: none');
  });
});
