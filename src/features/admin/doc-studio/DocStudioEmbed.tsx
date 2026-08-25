import { useEffect, useRef, useState } from "react";

/**
 * DocStudioEmbed — mounts the Doc Studio dc-runtime natively in the admin page
 * (no iframe). It loads the same assets public/ds/studio.html loads, injects
 * the studio's <x-dc> template into this page's DOM, and boots the runtime
 * against it via window.__dcBoot().
 *
 * The runtime (public/ds/support.js) is generated and untouched; it resolves
 * the root component name from location.pathname — /admin/docs/studio ends in
 * "studio", matching the precompiled logic registered as
 * window.__dcLogicClasses.studio by public/ds/studio-logic.js.
 *
 * Handoffs (staffInvite / billingDocument query params, sessionStorage
 * password handoff) keep working unchanged: same origin, same tab, same
 * location.search.
 */

const DS_BASE = "/ds";
const DESIGN_SYSTEM_CSS = `${DS_BASE}/_ds/classic-visions-design-system-e309148b-2428-4341-97fd-7a73961abd15/styles.css`;

const SCRIPT_SOURCES = [
  `${DS_BASE}/cloud-bridge.js`,
  `${DS_BASE}/react.production.min.js`,
  `${DS_BASE}/react-dom.production.min.js`,
  `${DS_BASE}/vendor/tinymce/tinymce.min.js`,
  `${DS_BASE}/support.js`,
  `${DS_BASE}/studio-logic.js`,
];

const STYLESHEET_HREFS = [
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap",
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200",
  DESIGN_SYSTEM_CSS,
];

/**
 * Scoped replacement for studio.html's <style> block. The original targets
 * body.embedded; here everything is scoped to .ds-native-host so the admin
 * shell is untouched.
 */
const NATIVE_CSS = `
.ds-native-host{display:flex;flex-direction:column;min-height:0;flex:1;background:#e9e5da;font-family:'Plus Jakarta Sans',sans-serif}
.ds-native-host #dc-root,.ds-native-host #dc-root>.sc-host{height:100%!important}
.ds-native-host #dc-root>.sc-host>div{height:100%!important}
.ds-native-host .ds-topbar{display:none!important}
.ds-native-host #embedded-tabbar{display:flex!important}
.ds-native-host [contenteditable]:empty:before{content:attr(data-ph);color:#a7aeb6}
.ds-native-host [contenteditable]:focus{border-color:#1A8A9C !important}
.ds-native-host .cv-in:focus{border-color:#1A8A9C !important;box-shadow:0 0 0 3px rgba(26,138,156,.12)}
.ds-native-host .cv-scroll::-webkit-scrollbar{width:10px;height:10px}
.ds-native-host .cv-scroll::-webkit-scrollbar-thumb{background:#cdc8ba;border-radius:8px;border:3px solid transparent;background-clip:content-box}
`;

declare global {
  interface Window {
    __dcBoot?: () => unknown;
  }
}

let assetsPromise: Promise<void> | null = null;
let templatePromise: Promise<string> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-ds-native="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.dataset.dsNative = src;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function loadStylesheet(href: string) {
  if (document.querySelector(`link[data-ds-native="${href}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = href;
  l.dataset.dsNative = href;
  document.head.appendChild(l);
}

function loadAssets(): Promise<void> {
  if (!assetsPromise) {
    assetsPromise = (async () => {
      STYLESHEET_HREFS.forEach(loadStylesheet);
      const style = document.createElement("style");
      style.dataset.dsNative = "native-css";
      style.textContent = NATIVE_CSS;
      document.head.appendChild(style);
      // Sequential: each script depends on the previous ones being executed.
      for (const src of SCRIPT_SOURCES) {
        await loadScript(src);
      }
      // support.js's init runs in a microtask after load; give it a tick so
      // window.__dcBoot is guaranteed to exist before we call it.
      await new Promise((r) => setTimeout(r, 0));
      if (typeof window.__dcBoot !== "function") {
        throw new Error("Doc Studio runtime failed to initialize");
      }
    })().catch((err) => {
      assetsPromise = null;
      throw err;
    });
  }
  return assetsPromise;
}

/**
 * Fetches studio.html once and returns the markup the runtime needs in the
 * document: the <x-dc> template plus the data-dc-script props element. Raw
 * text slicing mirrors the runtime's own parseDcText so the template reaches
 * the DOM byte-identical to the standalone page. Relative asset URLs
 * (assets/…) are rewritten to /ds/… because this page's base is not /ds/.
 */
function fetchTemplateMarkup(): Promise<string> {
  if (!templatePromise) {
    templatePromise = (async () => {
      const res = await fetch(`${DS_BASE}/studio.html`);
      if (!res.ok) throw new Error(`Failed to fetch Doc Studio template (${res.status})`);
      const text = await res.text();

      const open = /<x-dc(?:\s[^>]*)?>/.exec(text);
      const close = text.lastIndexOf("</x-dc>");
      if (!open || close === -1 || close < open.index) {
        throw new Error("Doc Studio template has no <x-dc> block");
      }
      let template = text.slice(open.index, close + "</x-dc>".length);
      template = template.replace(
        /(src|href)="(?!\/|https?:|data:|#|\{)([^"]*)"/g,
        (_m, attr: string, url: string) => `${attr}="${DS_BASE}/${url}"`,
      );

      const scriptMatch = text.match(/<script[^>]*data-dc-script[^>]*>[\s\S]*?<\/script>/);
      if (!scriptMatch) {
        throw new Error("Doc Studio template is missing its data-dc-script element");
      }
      return template + scriptMatch[0];
    })().catch((err) => {
      templatePromise = null;
      throw err;
    });
  }
  return templatePromise;
}

const DocStudioEmbed = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [markup] = await Promise.all([fetchTemplateMarkup(), loadAssets()]);
      if (cancelled || !hostRef.current) return;
      hostRef.current.innerHTML = markup;
      window.__dcBoot?.();
      if (!cancelled) setReady(true);
    })().catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : String(err));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {!ready && !error && (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading Doc Studio…
        </div>
      )}
      {error && (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-destructive">
          Doc Studio failed to load: {error}
        </div>
      )}
      <div
        ref={hostRef}
        className="ds-native-host"
        style={ready ? undefined : { display: "none" }}
      />
    </div>
  );
};

export default DocStudioEmbed;
