import { Link2 } from "lucide-react";
import type { ReactNode } from "react";

/** Extract section anchors from **bold** lines that start a paragraph (act as headings) */
export const extractWikiSections = (text: string) => {
  const sections: { id: string; label: string }[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    const m = trimmed.match(/^\*\*([^*]+)\*\*/);
    if (m) {
      const label = m[1].replace(/:$/, "").trim();
      const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (id) sections.push({ id, label });
    }
  }
  return sections;
};

/** Render markdown-ish content: **bold**, bullet lists, headings, with anchor ids */
export const renderWikiContent = (text: string) => {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={i} className="h-3" />);
      return;
    }

    const headingMatch = trimmed.match(/^\*\*([^*]+)\*\*(.*)/);
    const isHeading = headingMatch && !trimmed.startsWith("•") && !trimmed.startsWith("-") && !/^\d+\./.test(trimmed);

    const withBold = trimmed.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (isHeading && headingMatch) {
      const label = headingMatch[1].replace(/:$/, "").trim();
      const anchorId = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      elements.push(
        <h3 key={i} id={anchorId} className="text-sm font-semibold text-foreground mt-4 mb-1 flex items-center gap-2 group scroll-mt-4">
          {withBold}
          <a href={`#${anchorId}`} className="opacity-0 group-hover:opacity-60 transition-opacity" aria-label={`Link to ${label}`}>
            <Link2 className="h-3.5 w-3.5 text-primary" />
          </a>
        </h3>
      );
    } else if (trimmed.startsWith("• ") || trimmed.startsWith("- ")) {
      elements.push(
        <div key={i} className="flex gap-2 pl-3">
          <span className="shrink-0 text-primary">•</span>
          <span>{withBold.map((p) => typeof p === "string" ? p.replace(/^[•\-]\s*/, "") : p)}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const num = trimmed.match(/^(\d+)\./)?.[1];
      elements.push(
        <div key={i} className="flex gap-2 pl-3">
          <span className="shrink-0 font-medium text-primary">{num}.</span>
          <span>{withBold.map((p) => typeof p === "string" ? p.replace(/^\d+\.\s*/, "") : p)}</span>
        </div>
      );
    } else {
      elements.push(<p key={i}>{withBold}</p>);
    }
  });

  return elements;
};
