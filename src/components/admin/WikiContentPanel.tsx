import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link2 } from "lucide-react";
import type { WikiCategory } from "@/data/wikiContent";
import HelpFeedbackButtons from "./HelpFeedbackButtons";

interface WikiContentPanelProps {
  categories: WikiCategory[];
  activeArticleId: string | null;
}

/** Extract section anchors from **bold** lines that start a paragraph (act as headings) */
const extractSections = (text: string) => {
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
const renderContent = (text: string) => {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

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
        return <strong key={j} className="text-slate-100 font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (isHeading && headingMatch) {
      const label = headingMatch[1].replace(/:$/, "").trim();
      const anchorId = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      elements.push(
        <h3 key={i} id={anchorId} className="text-sm font-semibold text-slate-100 mt-4 mb-1 flex items-center gap-2 group scroll-mt-4">
          {withBold}
          <a href={`#${anchorId}`} className="opacity-0 group-hover:opacity-60 transition-opacity" aria-label={`Link to ${label}`}>
            <Link2 className="h-3.5 w-3.5 text-blue-400" />
          </a>
        </h3>
      );
    } else if (trimmed.startsWith("• ") || trimmed.startsWith("- ")) {
      elements.push(
        <div key={i} className="flex gap-2 pl-3">
          <span className="shrink-0 text-blue-400">•</span>
          <span>{withBold.map((p) => typeof p === "string" ? p.replace(/^[•\-]\s*/, "") : p)}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const num = trimmed.match(/^(\d+)\./)?.[1];
      elements.push(
        <div key={i} className="flex gap-2 pl-3">
          <span className="shrink-0 font-medium text-blue-400">{num}.</span>
          <span>{withBold.map((p) => typeof p === "string" ? p.replace(/^\d+\.\s*/, "") : p)}</span>
        </div>
      );
    } else {
      elements.push(<p key={i}>{withBold}</p>);
    }
  });

  return elements;
};

const WikiContentPanel = ({ categories, activeArticleId }: WikiContentPanelProps) => {
  let activeCategory: WikiCategory | undefined;
  let activeArticle: { id: string; title: string; content: string } | undefined;

  for (const cat of categories) {
    const found = cat.articles.find(a => a.id === activeArticleId);
    if (found) {
      activeCategory = cat;
      activeArticle = found;
      break;
    }
  }

  const sections = useMemo(
    () => (activeArticle ? extractSections(activeArticle.content) : []),
    [activeArticle]
  );

  if (!activeArticle || !activeCategory) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <p className="text-sm text-slate-500">
          Select an article from the sidebar.
        </p>
      </div>
    );
  }

  const Icon = activeCategory.icon;

  return (
    <ScrollArea className="flex-1 bg-slate-900">
      <div className="max-w-3xl mx-auto p-8 space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Icon className="h-3 w-3" />
          <span>{activeCategory.title}</span>
          <span>/</span>
          <span className="text-slate-300">{activeArticle.title}</span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-white tracking-tight">
          {activeArticle.title}
        </h1>

        {/* Table of Contents */}
        {sections.length > 1 && (
          <nav className="border border-slate-700/60 rounded-lg bg-slate-800/50 p-4 space-y-1">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2">On this page</p>
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block text-[13px] text-blue-400 hover:text-blue-300 transition-colors py-0.5"
              >
                {s.label}
              </a>
            ))}
          </nav>
        )}

        {/* Content */}
        <div className="text-[13px] leading-relaxed space-y-1.5 text-slate-300">
          {renderContent(activeArticle.content)}
        </div>

        {/* Feedback */}
        <div className="pt-6">
          <HelpFeedbackButtons articleId={activeArticle.id} pageSlug="wiki" />
        </div>
      </div>
    </ScrollArea>
  );
};

export default WikiContentPanel;
