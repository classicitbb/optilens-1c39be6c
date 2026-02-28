import { Link2 } from "lucide-react";
import type { ReactNode } from "react";

const toAnchorId = (label: string) =>
  label
    .toLowerCase()
    .replace(/[`#:*]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Extract section anchors from markdown headings and bold pseudo-headings */
export const extractWikiSections = (text: string) => {
  const sections: { id: string; label: string }[] = [];
  const seen = new Map<string, number>();

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    const markdownHeading = trimmed.match(/^#{1,3}\s+(.+)/);
    const boldHeading = trimmed.match(/^\*\*([^*]+)\*\*/);

    const label = markdownHeading?.[1]?.trim() ?? boldHeading?.[1]?.replace(/:$/, "").trim();
    if (!label) continue;

    const baseId = toAnchorId(label);
    if (!baseId) continue;

    const count = seen.get(baseId) ?? 0;
    seen.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count + 1}`;

    sections.push({ id, label });
  }

  return sections;
};

/** Render markdown-ish content with headings, bullets, ordered lists and fenced code blocks. */
export const renderWikiContent = (text: string) => {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  const flushCodeBlock = (key: string | number) => {
    if (codeLines.length === 0) return;
    elements.push(
      <pre key={key} className="overflow-x-auto rounded-md border bg-muted/30 p-3 text-[12px] leading-relaxed text-foreground">
        <code>{codeLines.join("\n")}</code>
      </pre>,
    );
    codeLines = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock(`code-${i}`);
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    if (!trimmed) {
      elements.push(<div key={i} className="h-3" />);
      return;
    }

    const markdownHeading = trimmed.match(/^(#{1,3})\s+(.+)/);
    const boldHeadingMatch = trimmed.match(/^\*\*([^*]+)\*\*(.*)/);

    const withBold = trimmed.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={j} className="text-foreground font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    if (markdownHeading) {
      const level = markdownHeading[1].length;
      const label = markdownHeading[2].trim();
      const anchorId = toAnchorId(label);
      const className =
        level === 1
          ? "text-lg font-bold text-foreground mt-5 mb-2"
          : level === 2
            ? "text-base font-semibold text-foreground mt-4 mb-1"
            : "text-sm font-semibold text-foreground mt-3 mb-1";

      elements.push(
        <h3 key={i} id={anchorId} className={`${className} flex items-center gap-2 group scroll-mt-4`}>
          <span>{label}</span>
          <a href={`#${anchorId}`} className="opacity-0 group-hover:opacity-60 transition-opacity" aria-label={`Link to ${label}`}>
            <Link2 className="h-3.5 w-3.5 text-primary" />
          </a>
        </h3>,
      );
      return;
    }

    const isBoldHeading =
      !!boldHeadingMatch && !trimmed.startsWith("•") && !trimmed.startsWith("-") && !/^\d+\./.test(trimmed);

    if (isBoldHeading && boldHeadingMatch) {
      const label = boldHeadingMatch[1].replace(/:$/, "").trim();
      const anchorId = toAnchorId(label);
      elements.push(
        <h3 key={i} id={anchorId} className="text-sm font-semibold text-foreground mt-4 mb-1 flex items-center gap-2 group scroll-mt-4">
          {withBold}
          <a href={`#${anchorId}`} className="opacity-0 group-hover:opacity-60 transition-opacity" aria-label={`Link to ${label}`}>
            <Link2 className="h-3.5 w-3.5 text-primary" />
          </a>
        </h3>,
      );
    } else if (trimmed.startsWith("• ") || trimmed.startsWith("- ")) {
      elements.push(
        <div key={i} className="flex gap-2 pl-3">
          <span className="shrink-0 text-primary">•</span>
          <span>{withBold.map((p) => (typeof p === "string" ? p.replace(/^[•\-]\s*/, "") : p))}</span>
        </div>,
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const num = trimmed.match(/^(\d+)\./)?.[1];
      elements.push(
        <div key={i} className="flex gap-2 pl-3">
          <span className="shrink-0 font-medium text-primary">{num}.</span>
          <span>{withBold.map((p) => (typeof p === "string" ? p.replace(/^\d+\.\s*/, "") : p))}</span>
        </div>,
      );
    } else {
      elements.push(<p key={i}>{withBold}</p>);
    }
  });

  if (inCodeBlock) flushCodeBlock("code-trailing");

  return elements;
};
