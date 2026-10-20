import { describe, expect, it } from 'vitest';
import { resolvePremiumManualUiMode } from './premiumManualUiMode';

describe('Premium manual UI is explicitly environment-scoped', () => {
  it('does not appear by default, with partial flags or conflicting modes', () => {
    expect(resolvePremiumManualUiMode({})).toBeNull();
    expect(resolvePremiumManualUiMode({ localUi: '1' })).toBeNull();
    expect(resolvePremiumManualUiMode({ localUi: '1', localTarget: 'preview' })).toBeNull();
    expect(resolvePremiumManualUiMode({ stageUi: '1', stageTarget: 'production' })).toBeNull();
    expect(resolvePremiumManualUiMode({
      stageUi: '1', stageTarget: 'preview', localUi: '1', localTarget: 'production',
    })).toBeNull();
  });
  it('supports mutually exclusive staging preview or local operator production', () => {
    expect(resolvePremiumManualUiMode({ stageUi: '1', stageTarget: 'preview' })).toBe('preview');
    expect(resolvePremiumManualUiMode({ localUi: '1', localTarget: 'production' })).toBe('local');
  });
});
