import { Agent } from 'node:https';
import * as tls from 'node:tls';
import type { Plugin, ProxyOptions } from 'vite';

const PREFIX = '/__supabase';
const loopbackAddresses = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

export function acceptsLocalProxyRequest(host: string, address: string, origin?: string): boolean {
  try {
    const page = new URL(`http://${host}`);
    if (!loopbackAddresses.has(address) || !localHosts.has(page.hostname)) return false;
    if (!origin) return true;
    const source = new URL(origin);
    return localHosts.has(source.hostname) && source.host === page.host && ['http:', 'https:'].includes(source.protocol);
  } catch { return false; }
}

export function supabaseDevProxy(backendUrl: string): { plugin: Plugin; proxy: Record<string, ProxyOptions> } {
  if (!backendUrl) return { plugin: { name: 'local-supabase-proxy' }, proxy: {} };
  const target = new URL(backendUrl);
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.search || target.hash) throw new Error('VITE_SUPABASE_URL must be an HTTP(S) project URL.');
  // Use the OS trust store alongside Node's roots (Node 22+), retaining normal
  // certificate verification for networks with an installed enterprise CA.
  const getCertificates = (tls as typeof tls & { getCACertificates?: (type: string) => string[] }).getCACertificates;
  const agent = target.protocol === 'https:' ? new Agent({ ca: getCertificates ? [...getCertificates('default'), ...getCertificates('system')] : undefined }) : undefined;
  const guard = (req: { url?: string; headers: { host?: string; origin?: string }; socket: { remoteAddress?: string } }, res: { writeHead: (status: number, headers: Record<string, string>) => unknown; end: (body: string) => unknown }, next: () => void) => {
    if (!req.url?.startsWith(PREFIX)) return next();
    const validPath = /^\/__supabase\/(rest|auth|storage|functions|graphql)\/v1(?:\/|\?|$)/.test(req.url);
    if (!validPath || !acceptsLocalProxyRequest(req.headers.host || '', req.socket.remoteAddress || '', req.headers.origin)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'The development data proxy is available only to this localhost session.' }));
      return;
    }
    next();
  };
  return {
    plugin: {
      name: 'local-supabase-proxy',
      configureServer(server) { server.middlewares.use(guard); },
      configurePreviewServer(server) { server.middlewares.use(guard); },
    },
    proxy: { [PREFIX]: {
      target: target.origin, agent, secure: true, changeOrigin: true,
      rewrite: path => path.slice(PREFIX.length),
      configure(proxy) {
        // The guarded same-origin dev server makes the upstream request with
        // the caller's existing bearer/apikey headers, never a privileged key.
        proxy.on('proxyReq', request => request.removeHeader('origin'));
      },
    } },
  };
}
