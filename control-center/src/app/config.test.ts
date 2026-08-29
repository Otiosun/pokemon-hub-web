import { describe, expect, it } from 'vitest';
import type { ControlCenterEnvironment } from './config';

const supported: readonly ControlCenterEnvironment[] = ['development', 'staging', 'production'];

describe('control center environment contract', () => {
  it('keeps the administrative environments explicit', () => {
    expect(supported).toEqual(['development', 'staging', 'production']);
  });
});
