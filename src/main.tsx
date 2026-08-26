import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './form-control-reset.css';
import './field-dex-refinement.css';
import './field-dex-product-cleanup.css';
import './pokedex-qa-fixes.css';
import './features/pokedex/pokedex-species-research.css';
import './features/collection/owned-pokemon-context-filter.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element #root was not found.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
