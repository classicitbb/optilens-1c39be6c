import { useMemo } from "react";

// Email HTML is untrusted. It renders in a sandboxed iframe with no scripts
// and no same-origin access; a CSP blocks remote images (tracking pixels)
// until the reader chooses to show them. Links open in a new tab.
export function EmailBody({ html, text, showImages }: { html: string | null; text: string | null; showImages: boolean }) {
  const srcDoc = useMemo(() => {
    if (!html) return null;
    const imgSrc = showImages ? "data: https: http:" : "data:";
    return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${imgSrc}; style-src 'unsafe-inline'; font-src data:">
<base target="_blank">
<style>body{margin:0;padding:16px;font-family:Calibri,"Segoe UI",Arial,sans-serif;font-size:14px;color:#222;background:#fff;word-wrap:break-word}img{max-width:100%;height:auto}</style>
</head><body>${html}</body></html>`;
  }, [html, showImages]);

  if (srcDoc) {
    return (
      <iframe
        title="Email message"
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        srcDoc={srcDoc}
        className="h-full min-h-[320px] w-full flex-1 rounded-md border border-[hsl(var(--admin-border))] bg-white"
      />
    );
  }
  return <div className="max-w-[72ch] whitespace-pre-wrap text-sm leading-relaxed">{text || "(This email has no text.)"}</div>;
}
