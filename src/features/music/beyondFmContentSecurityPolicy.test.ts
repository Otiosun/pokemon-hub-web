import { describe, expect, it } from 'vitest';
import deployment from '../../../vercel.json';

describe('Beyond FM production Content Security Policy', () => {
  const globalHeaders = deployment.headers.find((rule) => rule.source === '/(.*)')?.headers ?? [];
  const policy = globalHeaders.find((header) => header.key === 'Content-Security-Policy')?.value ?? '';

  it('allows same-origin and local Blob audio for imported MP3 and M4A files', () => {
    expect(policy).toContain("media-src 'self' blob: data:;");
    expect(policy).toContain("connect-src 'self' blob:");
    expect(policy).not.toContain("media-src 'none'");
  });

  it('retains the security barriers against remote injection', () => {
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain('media-src *');
    expect(policy).not.toContain('media-src *');
  });
});
