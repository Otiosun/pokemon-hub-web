import { describe,expect,it } from 'vitest';
import { resolvePlayerProxyRoute } from '../../api/hub/player/[...path]';

const base='https://preview.invalid';
const id='11111111-1111-4111-8111-111111111111';
const route=(pathname:string,method:string)=>
  resolvePlayerProxyRoute(new URL(pathname,base),method);

describe('Evolution routes reuse existing protected Hub proxy function',()=>{
  it('passes only one validated UUID query to read-only canonical evolution options',()=>{
    expect(route('/api/hub/player/pokemon/evolution-options?pokemonInstanceId='+id,'GET'))
      .toEqual({upstreamPath:'/v1/hub/player/pokemon/evolution-options?pokemonInstanceId='+id,
        allowedMethod:'GET',premiumStaging:false});
    for(const path of [
      '/api/hub/player/pokemon/evolution-options',
      '/api/hub/player/pokemon/evolution-options?pokemonInstanceId=bad',
      '/api/hub/player/pokemon/evolution-options?pokemonInstanceId='+id+'&playerId='+id,
      '/api/hub/player/pokemon/evolution-options?pokemonInstanceId='+id+'&pokemonInstanceId='+id,
    ])expect(route(path,'GET')).toBeNull();
    expect(route('/api/hub/player/pokemon/evolution-options?pokemonInstanceId='+id,'POST')).toBeNull();
  });
  it('only accepts POST to evolution mutation, not GET nor arbitrary player routes',()=>{
    expect(route('/api/hub/player/pokemon/evolve','POST')).toEqual({
      upstreamPath:'/v1/hub/player/pokemon/evolve',allowedMethod:'POST',premiumStaging:false,
    });
    expect(route('/api/hub/player/pokemon/evolve','GET')).toBeNull();
    expect(route('/api/hub/player/pokemon/evolve?playerId='+id,'POST')).toBeNull();
    expect(route('/api/hub/player/pokemon/capture','POST')).toBeNull();
  });
});
