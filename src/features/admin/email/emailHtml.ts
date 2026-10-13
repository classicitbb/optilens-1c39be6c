// Builds what compose sends: one email-client-friendly HTML part and a plain
// text part. Mail clients ignore stylesheets and classes, so everything that
// matters is an inline style.

export const EMAIL_FONT = "font-family:Calibri,'Segoe UI',Arial,sans-serif;font-size:11pt;color:#1f1f1f";
const QUOTE_STYLE = "margin:0 0 0 0.8ex;border-left:1px solid #cccccc;padding-left:1ex;color:#555555";

const DROP_WITH_CONTENT = new Set(["script", "style", "iframe", "object", "embed", "svg", "math", "form", "input", "button", "select", "textarea", "link", "meta", "base", "noscript", "template"]);
const URL_ATTRIBUTES = new Set(["href", "src"]);
const SAFE_HREF = /^(https?:|mailto:|tel:|#)/i;
const SAFE_SRC = /^(https?:|cid:|data:image\/(png|jpe?g|gif|webp);)/i;

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Plain text (one paragraph per line) as editor HTML. */
export function textToHtml(text: string): string {
  if (!text) return "";
  return text.split(/\r?\n/).map((line) => `<p>${escapeHtml(line)}</p>`).join("");
}

/**
 * Allow-list clean-up for HTML staff paste in (signatures from Doc Studio,
 * Outlook): keeps layout tags, tables, images and inline styles; drops
 * scripts, event handlers, forms, embeds and unsafe URLs.
 */
export function sanitizeEmailHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const walk = (node: Element) => {
    for (const child of [...node.children]) {
      const tag = child.tagName.toLowerCase();
      if (DROP_WITH_CONTENT.has(tag)) {
        child.remove();
        continue;
      }
      for (const attribute of [...child.attributes]) {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim();
        const unsafeUrl = URL_ATTRIBUTES.has(name) && !(name === "href" ? SAFE_HREF : SAFE_SRC).test(value);
        const unsafeStyle = name === "style" && /expression\s*\(|javascript:|url\s*\(\s*['"]?\s*(?!https?:|data:image)/i.test(value);
        if (name.startsWith("on") || name === "srcdoc" || name === "formaction" || unsafeUrl || unsafeStyle) child.removeAttribute(attribute.name);
      }
      walk(child);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

/** Plain-text part for an HTML fragment: paragraphs, line breaks, list markers, quotes, link targets. */
export function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const render = (node: Node, quoteDepth: number): string => {
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? "").replace(/\s+/g, " ");
    if (!(node instanceof Element)) return "";
    const tag = node.tagName.toLowerCase();
    const inner = (depth = quoteDepth) => [...node.childNodes].map((child) => render(child, depth)).join("");
    switch (tag) {
      case "br":
        return "\n";
      case "p":
      case "div":
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "tr":
        return `${inner().trim()}\n`;
      case "td":
      case "th":
        return `${inner().trim()} `;
      case "li": {
        const list = node.parentElement;
        const marker = list?.tagName.toLowerCase() === "ol" ? `${[...list.children].indexOf(node) + 1}. ` : "- ";
        return `${marker}${inner().trim()}\n`;
      }
      case "ul":
      case "ol":
      case "table":
        return `${inner()}\n`;
      case "blockquote":
        return `${inner(quoteDepth + 1).trimEnd().split("\n").map((line) => `> ${line}`).join("\n")}\n`;
      case "a": {
        const text = inner();
        const href = node.getAttribute("href") ?? "";
        return href && !href.startsWith("mailto:") && href !== text.trim() ? `${text} (${href})` : text;
      }
      case "img":
        return node.getAttribute("alt") ?? "";
      default:
        return inner();
    }
  };
  return render(doc.body, 0)
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Editor HTML with the inline styling mail clients need: paragraphs without
 * extra margins (Outlook-style; Enter twice makes a blank line), empty
 * paragraphs kept as a visible line, quotes with a rule.
 */
export function editorHtmlForEmail(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  for (const p of doc.body.querySelectorAll("p")) {
    p.setAttribute("style", "margin:0");
    if (!p.textContent && !p.querySelector("img, br")) p.innerHTML = "<br>";
  }
  for (const quote of doc.body.querySelectorAll("blockquote")) quote.setAttribute("style", QUOTE_STYLE);
  for (const list of doc.body.querySelectorAll("ul, ol")) list.setAttribute("style", "margin:0 0 0 1.5em;padding:0");
  for (const heading of doc.body.querySelectorAll("h1, h2, h3")) heading.setAttribute("style", "margin:0.4em 0 0.2em");
  return doc.body.innerHTML;
}

/** Quoted original (reply / forward) as plain text, shown as a quote block in HTML. */
function quotedToHtml(quoted: string): string {
  const lines = quoted.replace(/^\s+/, "").split(/\r?\n/);
  const header: string[] = [];
  const body: string[] = [];
  for (const line of lines) {
    if (/^>/.test(line)) body.push(line.replace(/^> ?/, ""));
    else if (body.length) body.push(line);
    else header.push(line);
  }
  const toHtml = (part: string[]) => part.map((line) => escapeHtml(line)).join("<br>");
  return `<div style="margin-top:1em">${toHtml(header)}${body.length ? `<blockquote style="${QUOTE_STYLE}">${toHtml(body)}</blockquote>` : ""}</div>`;
}

export function buildOutgoingEmail({ bodyHtml, signatureHtml, quoted }: { bodyHtml: string; signatureHtml?: string | null; quoted?: string | null }) {
  const body = editorHtmlForEmail(sanitizeEmailHtml(bodyHtml));
  const signature = signatureHtml ? sanitizeEmailHtml(signatureHtml) : "";
  const html = [
    `<div style="${EMAIL_FONT}">`,
    body,
    signature ? `<div style="margin-top:1em">${signature}</div>` : "",
    quoted?.trim() ? quotedToHtml(quoted) : "",
    "</div>",
  ].join("");
  const text = [htmlToPlainText(bodyHtml), signature ? htmlToPlainText(signature) : "", quoted?.trim() ?? ""].filter(Boolean).join("\n\n");
  return { html, text };
}
