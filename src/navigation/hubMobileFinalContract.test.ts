import { describe, expect, it } from 'vitest';
import hubNavigationCss from '../components/hub-navigation.css?inline';
import hubModuleHeaderCss from '../components/hub-module-header.css?inline';
import ownedDetailCss from '../features/collection/owned-pokemon-detail.css?inline';
import ownedCollectionCss from '../features/collection/owned-pokemon-collection-v2.css?inline';
import journeyReviewCss from '../features/journey/journey-page-review-fixes.css?inline';
import portalPolishCss from '../styles/player-portal-uat-polish.css?inline';

describe('Hub mobile final contract', () => {
  it('keeps primary mobile menu controls at a 44px minimum target', () => {
    expect(hubNavigationCss).toContain('width: 44px;');
    expect(hubNavigationCss).toContain('min-height: 44px;');
    expect(hubModuleHeaderCss).toContain('width: 44px;');
    expect(hubModuleHeaderCss).toContain('min-height: 44px;');
  });

  it('keeps collection and detail actions comfortably tappable on narrow screens', () => {
    expect(ownedDetailCss).toContain('min-height: 44px;');
    expect(ownedCollectionCss).toContain('min-height: 44px;');
  });

  it('keeps the Journey modal close action at 44px', () => {
    expect(journeyReviewCss).toContain('width: 44px;');
    expect(journeyReviewCss).toContain('height: 44px;');
  });

  it('allows long Store prices to wrap rather than overflow a narrow card', () => {
    expect(portalPolishCss).toContain('overflow-wrap: anywhere;');
  });
});
