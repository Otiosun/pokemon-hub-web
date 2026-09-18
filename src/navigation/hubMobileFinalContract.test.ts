import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function css(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const hubNavigationCss = css('src/components/hub-navigation.css');
const hubModuleHeaderCss = css('src/components/hub-module-header.css');
const ownedDetailCss = css('src/features/collection/owned-pokemon-detail.css');
const ownedCollectionCss = css('src/features/collection/owned-pokemon-collection-v2.css');
const journeyReviewCss = css('src/features/journey/journey-page-review-fixes.css');
const portalPolishCss = css('src/styles/player-portal-uat-polish.css');

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
