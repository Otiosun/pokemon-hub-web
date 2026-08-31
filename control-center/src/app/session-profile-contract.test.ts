import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const appPath = fileURLToPath(new URL('../App.tsx', import.meta.url));
const sidebarPath = fileURLToPath(
  new URL('../components/shell/ControlCenterSidebar.tsx', import.meta.url),
);
const panelPath = fileURLToPath(
  new URL('../components/shell/SessionProfilePanel.tsx', import.meta.url),
);

describe('Control Center current principal/session profile contract', () => {
  it('offers a session profile entry point on desktop and mobile', async () => {
    const app = await readFile(appPath, 'utf8');
    const sidebar = await readFile(sidebarPath, 'utf8');

    expect(app).toContain('const [sessionProfileOpen, setSessionProfileOpen]');
    expect(app).toContain('className="session-profile-mobile"');
    expect(app).toContain('Minha sessão');
    expect(app).toContain('<SessionProfilePanel');
    expect(sidebar).toContain('onOpenSession');
    expect(sidebar).toContain('aria-label="Abrir minha sessão"');
  });

  it('renders backend-authoritative identity and exposes only current-session logout as a write action', async () => {
    let panel = '';
    try {
      panel = await readFile(panelPath, 'utf8');
    } catch {
      // RED is expected until the session profile surface exists.
    }

    expect(panel).toContain('session.principalId');
    expect(panel).toContain('session.environment');
    expect(panel).toContain('session.roles');
    expect(panel).toContain('session.capabilities');
    expect(panel).toContain('session.scopes');
    expect(panel).toContain('Revalidar sessão');
    expect(panel).toContain('Sair');
    expect(panel).toContain('onLogout');
    expect(panel).not.toContain('simulate');
    expect(panel).not.toContain('apply');
  });

  it('redirects to Access logout only after the local revocation request resolves', async () => {
    const app = await readFile(appPath, 'utf8');

    expect(app).toContain('await client.logoutCurrentSession()');
    expect(app).toContain('window.location.assign(logoutPath)');
    expect(app.indexOf('await client.logoutCurrentSession()')).toBeLessThan(
      app.indexOf('window.location.assign(logoutPath)'),
    );
  });
});
