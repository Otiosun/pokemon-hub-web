import { describe, expect, it, vi } from 'vitest';
import { resolvePrepareIdempotency } from './prepare-idempotency';

describe('PREPARE idempotency intent boundary', () => {
  it('reuses the same key for an identical payload fingerprint', () => {
    const createKey = vi.fn(() => 'operation:key-1');
    const first = resolvePrepareIdempotency(null, 'target:a|delta:5|reason:x', createKey);
    const retry = resolvePrepareIdempotency(first.state, 'target:a|delta:5|reason:x', createKey);

    expect(first.key).toBe('operation:key-1');
    expect(retry.key).toBe('operation:key-1');
    expect(createKey).toHaveBeenCalledTimes(1);
  });

  it('rotates the key when the operator changes the intent', () => {
    const createKey = vi
      .fn<() => string>()
      .mockReturnValueOnce('operation:key-1')
      .mockReturnValueOnce('operation:key-2');
    const first = resolvePrepareIdempotency(null, 'target:a|delta:5|reason:x', createKey);
    const changed = resolvePrepareIdempotency(
      first.state,
      'target:a|delta:-5|reason:x',
      createKey,
    );

    expect(changed.key).toBe('operation:key-2');
    expect(createKey).toHaveBeenCalledTimes(2);
  });
});
