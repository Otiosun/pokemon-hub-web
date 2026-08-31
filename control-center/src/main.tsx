import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './app/design-tokens.css';
import './features/player360/activity-history.css';
import './features/player360/battle-context.css';
import './features/player360/inventory-economy.css';
import './features/player360/player360-detail-tabs.css';
import './features/player360/player360-runtime.css';
import './features/player360/pokedex-panel.css';
import './features/player360/pokemon-roster.css';
import './features/player360/world-location.css';
import './features/session/session.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Control Center root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
