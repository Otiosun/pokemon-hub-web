import { describe, expect, it } from 'vitest';
import hubNavigationCss from '../components/hub-navigation.css?raw';
import hubModuleHeaderCss from '../components/hub-module-header.css?raw';
import ownedDetailCss from '../features/collection/owned-pokemon-detail.css?raw';
import ownedCollectionCss from '../features/collection/owned-pokemon-collection-v2.css?raw';
import journeyReviewCss from '../features/journey/journey-page-review-fixes.css?raw';
import portalPolishCss from '../styles/player-portal-uat-polish.css?raw';

describe('Hub mobile final contract', () => {
  it('keeps primary mobile menu controls at a 44px minimum target', () => {
    expect(hubNavigationCss).toContain('width: 44px;\n    min-width: 44px;\n    height: 44px;\n    min-height: 44px;');
    expect(hubModuleHeaderCss).toContain('width: 44px;\n    min-width: 44px;\n    height: 44px;\n    min-height: 44px;');
  });

  it('keeps collection and detail actions comfortably tappable on narrow screens', () => {
    expect(ownedDetailCss).toContain('min-width: 44px;\n    min-height: 44px;');
    expect(ownedCollectionCss).toContain('.owned-pokemon-team-head > a {\n    min-height: 44px;');
  });

  it('keeps the Journey modal close action at 44px', () => {
    expect(journeyReviewCss).toContain('.journey-share-toolbar button {\n    width: 44px;\n    height: 44px;');
  });

  it('allows long Store prices to wrap rather than overflow a narrow card', () => {
    expect(portalPolishCss).toContain('.champion-store-price strong {\n    min-width: 0;\n    overflow-wrap: anywhere;');
  });
});
