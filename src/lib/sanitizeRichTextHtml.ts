const ALLOWED_TAGS = new Set([
  "a",
  "blockquote",
  "br",
  "code",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "u",
  "ul",
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel", "title"]),
};

const SAFE_URL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
// svg is dropped because SVG supports JS-execution vectors (animate, foreignObject, etc.)
const DROP_CONTENT_TAGS = new Set(["script", "style", "iframe", "object", "embed", "svg", "math"]);

function fallbackSanitize(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*("|')\s*javascript:[^"']*("|')/gi, ' $1="#"');
}

function sanitizeHref(rawHref: string | null): string | null {
  if (!rawHref) {
    return null;
  }

  const trimmed = rawHref.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("#") || trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed, "https://example.local");
    if (SAFE_URL_PROTOCOLS.has(url.protocol)) {
      return trimmed;
    }
  } catch {
    return null;
  }

  return null;
}

function sanitizeElementAttributes(element: Element) {
  const tagName = element.tagName.toLowerCase();
  const allowList = ALLOWED_ATTRIBUTES[tagName] ?? new Set<string>();

  for (const attribute of [...element.attributes]) {
    const name = attribute.name.toLowerCase();

    if (name.startsWith("on") || !allowList.has(name)) {
      element.removeAttribute(attribute.name);
      continue;
    }

    if (tagName === "a" && name === "href") {
      const safeHref = sanitizeHref(attribute.value);
      if (!safeHref) {
        element.removeAttribute("href");
        continue;
      }

      element.setAttribute("href", safeHref);
      if (element.getAttribute("target") === "_blank") {
        element.setAttribute("rel", "noopener noreferrer");
      }
    }
  }
}

export function sanitizeRichTextHtml(rawHtml: string): string {
  if (!rawHtml) {
    return "";
  }

  if (typeof window === "undefined" || typeof window.DOMParser === "undefined") {
    return fallbackSanitize(rawHtml);
  }

  const parser = new window.DOMParser();
  const document = parser.parseFromString(`<div>${rawHtml}</div>`, "text/html");
  const root = document.body.firstElementChild;

  if (!root) {
    return "";
  }

  const walker = document.createTreeWalker(root, window.NodeFilter.SHOW_ELEMENT);
  const toProcess: Element[] = [];

  let currentNode = walker.currentNode;
  while (currentNode) {
    if (currentNode instanceof window.Element) {
      toProcess.push(currentNode);
    }
    currentNode = walker.nextNode();
  }

  for (const element of toProcess) {
    if (element === root) {
      continue;
    }

    const tagName = element.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) {
      const parent = element.parentNode;
      if (!parent) {
        continue;
      }

      if (DROP_CONTENT_TAGS.has(tagName)) {
        parent.removeChild(element);
        continue;
      }

      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      parent.removeChild(element);
      continue;
    }

    sanitizeElementAttributes(element);
  }

  return root.innerHTML;
}

export function sanitizeBusinessPlanRichNotes(rawHtml: string): string {
  return sanitizeRichTextHtml(rawHtml);
}
