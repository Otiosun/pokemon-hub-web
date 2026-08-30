import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './app/design-tokens.css';
import './features/player360/player360-runtime.css';
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
