import { describe, expect, it, vi } from 'vitest';
import { getPokemon3dCapability } from './pokemon3dCapability';

describe('Pokemon 3D capability', () => {
  it('marks shiny as unsupported before touching the manifest', async () => {
    const fetcher = vi.fn();

    await expect(
      getPokemon3dCapability(
        { dex: 384, species: 'rayquaza', variant: 'shiny' },
        fetcher,
      ),
    ).resolves.toEqual({
      status: 'unsupported',
      reason: 'variant-unsupported',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });


  it('does not guess an owned Pokemon form when the Hub API has not provided one', async () => {
    const fetcher = vi.fn();

    await expect(
      getPokemon3dCapability(
        { dex: 386, species: 'deoxys', form: null, variant: 'regular' },
        fetcher,
      ),
    ).resolves.toEqual({
      status: 'unsupported',
      reason: 'form-identity-missing',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('accepts the catalog default form when its slug matches the species slug', async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ assets: [{ dex: 6, species: 'charizard' }] }), {
        status: 200,
      }),
    );

    await expect(
      getPokemon3dCapability(
        { dex: 6, species: 'charizard', form: 'charizard', variant: 'regular' },
        fetcher,
      ),
    ).resolves.toEqual({ status: 'ready' });
  });

  it('keeps non-default forms unsupported until the 3D manifest models forms explicitly', async () => {
    const fetcher = vi.fn();

    await expect(
      getPokemon3dCapability(
        { dex: 386, species: 'deoxys', form: 'attack', variant: 'regular' },
        fetcher,
      ),
    ).resolves.toEqual({
      status: 'unsupported',
      reason: 'form-unsupported',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('enables regular 3D only when the generated manifest contains the species', async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          assets: [
            { dex: 384, species: 'rayquaza', path: 'rayquaza' },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(
      getPokemon3dCapability(
        { dex: 384, species: 'rayquaza', variant: 'regular' },
        fetcher,
      ),
    ).resolves.toEqual({ status: 'ready' });
  });

  it('keeps absent regular models explicitly unsupported', async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ assets: [{ dex: 6, species: 'charizard' }] }), {
        status: 200,
      }),
    );

    await expect(
      getPokemon3dCapability(
        { dex: 248, species: 'tyranitar', variant: 'regular' },
        fetcher,
      ),
    ).resolves.toEqual({
      status: 'unsupported',
      reason: 'not-in-manifest',
    });
  });

  it('distinguishes manifest failure from unsupported assets', async () => {
    const fetcher = vi.fn(async () => new Response('offline', { status: 503 }));

    await expect(
      getPokemon3dCapability(
        { dex: 6, species: 'charizard', variant: 'regular' },
        fetcher,
      ),
    ).resolves.toEqual({
      status: 'failed',
      reason: 'manifest-unavailable',
    });
  });
});
