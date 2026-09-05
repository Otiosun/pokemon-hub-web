import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json';

const visualAssetModules = import.meta.glob('../visual-assets/*');

describe('legacy asset spike integrity', () => {
  it('does not ship the retired model-viewer runtime used by the first Asset Lab spike', () => {
    expect(packageJson.dependencies).not.toHaveProperty('@google/model-viewer');
  });

  it('does not keep the retired three-starter Asset Lab manifest in the product source tree', () => {
    expect(Object.keys(visualAssetModules)).not.toContain('../visual-assets/starterManifest.ts');
    expect(Object.keys(visualAssetModules)).not.toContain('../visual-assets/starterManifest.test.ts');
  });
});
