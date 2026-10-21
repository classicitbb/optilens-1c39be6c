import { describe, expect, it, vi } from 'vitest';
import { createSupabaseDevFetch, supabaseRequestUrl } from '@/lib/supabaseDevTransport';
import { acceptsLocalProxyRequest } from '../../../scripts/vite-supabase-proxy';

const backend = 'https://example.supabase.co';
describe('localhost development data transport', () => {
  it.each(['http://localhost:5173', 'http://127.0.0.1:8082', 'http://[::1]:5200'])('proxies all project HTTP APIs on %s', origin => {
    for (const service of ['rest', 'auth', 'storage', 'functions', 'graphql']) {
      expect(supabaseRequestUrl(`${backend}/${service}/v1/query?test=1`, backend, true, origin)).toBe(`${origin}/__supabase/${service}/v1/query?test=1`);
    }
  });
  it('keeps production, nonlocal hosts and other destinations direct', () => {
    const url = `${backend}/rest/v1/customers`;
    expect(supabaseRequestUrl(url, backend, false, 'http://localhost:5173')).toBe(url);
    expect(supabaseRequestUrl(url, backend, true, 'https://www.classicvisions.net')).toBe(url);
    expect(supabaseRequestUrl(`${backend}.evil.test/rest/v1`, backend, true, 'http://localhost:5173')).toContain('.evil.test');
  });
  it('retains the caller method, credentials, authorization, body and cancellation signal', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    try {
      const controller = new AbortController();
      const request = new Request(`${backend}/functions/v1/live-data-gateway`, { method: 'POST', headers: { authorization: 'Bearer fixture' }, body: '{"action":"request"}', signal: controller.signal });
      await createSupabaseDevFetch(backend)(request, { credentials: 'omit' });
      const forwarded = fetchMock.mock.calls[0][0] as Request;
      expect(forwarded.url).toBe(`${window.location.origin}/__supabase/functions/v1/live-data-gateway`);
      expect(forwarded.method).toBe('POST');
      expect(forwarded.headers.get('authorization')).toBe('Bearer fixture');
      expect(await forwarded.text()).toBe('{"action":"request"}');
      expect(fetchMock.mock.calls[0][1]).toEqual({ credentials: 'omit' });
      controller.abort();
      expect(forwarded.signal.aborted).toBe(true);
    } finally { fetchMock.mockRestore(); }
  });
  it('only accepts same-origin loopback sessions, preserving normal upstream authentication', () => {
    expect(acceptsLocalProxyRequest('127.0.0.1:5173', '127.0.0.1', 'http://127.0.0.1:5173')).toBe(true);
    expect(acceptsLocalProxyRequest('localhost:8089', '::1')).toBe(true);
    expect(acceptsLocalProxyRequest('localhost:5173', '10.0.0.8', 'http://localhost:5173')).toBe(false);
    expect(acceptsLocalProxyRequest('localhost:5173', '127.0.0.1', 'https://evil.test')).toBe(false);
    expect(acceptsLocalProxyRequest('localhost:5173', '127.0.0.1', 'http://localhost:8080')).toBe(false);
    expect(acceptsLocalProxyRequest('evil.test', '127.0.0.1')).toBe(false);
  });
});
