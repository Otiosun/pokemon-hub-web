import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ChampionStoreCartBridge } from './features/store/ChampionStoreCartBridge';
import './styles.css';
import './form-control-reset.css';
import './pokedex-qa-fixes.css';
import './features/asset-lab/generations-viewer.css';
import './features/pokedex/pokedex-index-discovery.css';
import './features/pokedex/pokemon-asset-integration.css';
import './features/pokedex/pokedex-progress-readout.css';
import './features/pokedex/pokedex-species-review-polish.css';
import './features/collection/owned-pokemon-context-filter.css';
import './features/collection/owned-pokemon-collection-dex-scale.css';
import './features/collection/owned-pokemon-detail-review-polish.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element #root was not found.');
}

createRoot(root).render(
  <StrictMode>
    <App />
    <ChampionStoreCartBridge />
  </StrictMode>,
);
