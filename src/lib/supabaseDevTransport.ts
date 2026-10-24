export const SUPABASE_DEV_PREFIX = '/__supabase';

// Keep the real project URL for session keys and OAuth configuration. Only the
// HTTP transport uses the local proxy; the hosted build always connects directly.
export function supabaseRequestUrl(url: string, backendUrl: string, development: boolean, pageOrigin: string): string {
  const base = backendUrl.replace(/\/+$/, '');
  const host = new URL(pageOrigin).hostname;
  if (!development || !['localhost', '127.0.0.1', '[::1]'].includes(host) || !url.startsWith(`${base}/`)) return url;
  return `${pageOrigin}${SUPABASE_DEV_PREFIX}${url.slice(base.length)}`;
}

export function createSupabaseDevFetch(backendUrl: string): typeof fetch {
  return (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    const target = typeof window === 'undefined' ? url : supabaseRequestUrl(url, backendUrl, import.meta.env.DEV, window.location.origin);
    if (target === url) return fetch(input, init);
    if (!(input instanceof Request)) return fetch(target, init);
    // Request properties are not enumerable RequestInit fields. Copy them
    // explicitly so POST bodies and bearer headers survive URL replacement.
    const forwarded: RequestInit & { duplex: 'half' } = {
      method: input.method, headers: input.headers, body: input.body,
      signal: input.signal, credentials: input.credentials, mode: input.mode,
      cache: input.cache, redirect: input.redirect, referrer: input.referrer,
      referrerPolicy: input.referrerPolicy, integrity: input.integrity,
      keepalive: input.keepalive, duplex: 'half',
    };
    return fetch(new Request(target, forwarded), init);
  };
}
