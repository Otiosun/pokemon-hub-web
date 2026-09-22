import { describe, expect, it } from 'vitest';

describe('vitest smoke', () => {
  it('executes a trivial assertion', () => {
    expect(1 + 1).toBe(2);
  });
});
