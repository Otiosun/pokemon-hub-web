import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json';

describe('legacy asset spike integrity', () => {
  it('does not ship the retired model-viewer runtime used by the first Asset Lab spike', () => {
    expect(packageJson.dependencies).not.toHaveProperty('@google/model-viewer');
  });
});
