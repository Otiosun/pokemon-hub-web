import { describe, expect, it } from 'vitest';
import {
  getPokemon3dCapability,
  type Pokemon3dCapabilityFetcher,
} from './pokemon3dCapability';

describe('Pokemon 3D capability', () => {
  it('marks shiny as unsupported before touching the manifest', async () => {
    let manifestFetches = 0;
    const fetcher: Pokemon3dCapabilityFetcher = async () => {
      manifestFetches += 1;
      return new Response('unexpected manifest fetch', { status: 500 });
    };

    await expect(
      getPokemon3dCapability(
        { dex: 384, species: 'rayquaza', variant: 'shiny' },
        fetcher,
      ),
    ).resolves.toEqual({
      status: 'unsupported',
      reason: 'variant-unsupported',
    });
    expect(manifestFetches).toBe(0);
  });


  it('does not guess an owned Pokemon form when the Hub API has not provided one', async () => {
    let manifestFetches = 0;
    const fetcher: Pokemon3dCapabilityFetcher = async () => {
      manifestFetches += 1;
      return new Response('unexpected manifest fetch', { status: 500 });
    };

    await expect(
      getPokemon3dCapability(
        { dex: 386, species: 'deoxys', form: null, variant: 'regular' },
        fetcher,
      ),
    ).resolves.toEqual({
      status: 'unsupported',
      reason: 'form-identity-missing',
    });
    expect(manifestFetches).toBe(0);
  });

  it('accepts the catalog default form when its slug matches the species slug', async () => {
    const fetcher: Pokemon3dCapabilityFetcher = async () =>
      new Response(JSON.stringify({ assets: [{ dex: 6, species: 'charizard' }] }), {
        status: 200,
      });

    await expect(
      getPokemon3dCapability(
        { dex: 6, species: 'charizard', form: 'charizard', variant: 'regular' },
        fetcher,
      ),
    ).resolves.toEqual({ status: 'ready' });
  });

  it('keeps non-default forms unsupported until the 3D manifest models forms explicitly', async () => {
    let manifestFetches = 0;
    const fetcher: Pokemon3dCapabilityFetcher = async () => {
      manifestFetches += 1;
      return new Response('unexpected manifest fetch', { status: 500 });
    };

    await expect(
      getPokemon3dCapability(
        { dex: 386, species: 'deoxys', form: 'attack', variant: 'regular' },
        fetcher,
      ),
    ).resolves.toEqual({
      status: 'unsupported',
      reason: 'form-unsupported',
    });
    expect(manifestFetches).toBe(0);
  });

  it('enables regular 3D only when the generated manifest contains the species', async () => {
    const fetcher: Pokemon3dCapabilityFetcher = async () =>
      new Response(
        JSON.stringify({
          assets: [{ dex: 384, species: 'rayquaza', path: 'rayquaza' }],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );

    await expect(
      getPokemon3dCapability(
        { dex: 384, species: 'rayquaza', variant: 'regular' },
        fetcher,
      ),
    ).resolves.toEqual({ status: 'ready' });
  });

  it('bypasses the manifest cache when an explicit retry is requested', async () => {
    let requestCache: RequestCache | undefined;
    const fetcher: Pokemon3dCapabilityFetcher = async (_input, init) => {
      requestCache = init?.cache;
      return new Response(JSON.stringify({ assets: [{ dex: 6, species: 'charizard' }] }), {
        status: 200,
      });
    };

    await expect(
      getPokemon3dCapability(
        { dex: 6, species: 'charizard', variant: 'regular', refresh: true },
        fetcher,
      ),
    ).resolves.toEqual({ status: 'ready' });

    expect(requestCache).toBe('no-store');
  });

  it('keeps absent regular models explicitly unsupported', async () => {
    const fetcher: Pokemon3dCapabilityFetcher = async () =>
      new Response(JSON.stringify({ assets: [{ dex: 6, species: 'charizard' }] }), {
        status: 200,
      });

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
    const fetcher: Pokemon3dCapabilityFetcher = async () =>
      new Response('offline', { status: 503 });

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
