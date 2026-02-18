import { ScrollArea } from "@/components/ui/scroll-area";
import type { WikiCategory } from "@/data/wikiContent";

interface WikiContentPanelProps {
  categories: WikiCategory[];
  activeArticleId: string | null;
}

/** Render markdown-ish content: **bold**, bullet lists, headings */
const renderContent = (text: string) => {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={i} className="h-3" />);
      return;
    }

    // Bold markers
    const withBold = trimmed.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j} style={{ color: "hsl(210 20% 92%)" }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (trimmed.startsWith("• ") || trimmed.startsWith("- ")) {
      elements.push(
        <div key={i} className="flex gap-2 pl-2">
          <span className="shrink-0" style={{ color: "hsl(215 65% 65%)" }}>•</span>
          <span>{withBold.map((p, k) => typeof p === "string" ? p.replace(/^[•\-]\s*/, "") : p)}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const num = trimmed.match(/^(\d+)\./)?.[1];
      elements.push(
        <div key={i} className="flex gap-2 pl-2">
          <span className="shrink-0 font-medium" style={{ color: "hsl(215 65% 65%)" }}>{num}.</span>
          <span>{withBold.map((p, k) => typeof p === "string" ? p.replace(/^\d+\.\s*/, "") : p)}</span>
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

  if (!activeArticle || !activeCategory) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: "hsl(210 15% 55%)" }}>
          Select an article from the sidebar.
        </p>
      </div>
    );
  }

  const Icon = activeCategory.icon;

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[11px]" style={{ color: "hsl(210 15% 55%)" }}>
          <Icon className="h-3 w-3" />
          <span>{activeCategory.title}</span>
          <span>/</span>
          <span style={{ color: "hsl(210 20% 80%)" }}>{activeArticle.title}</span>
        </div>

        {/* Title */}
        <h1 className="text-lg font-semibold" style={{ color: "hsl(0 0% 100%)" }}>
          {activeArticle.title}
        </h1>

        {/* Content */}
        <div
          className="text-[13px] leading-relaxed space-y-1.5"
          style={{ color: "hsl(210 15% 70%)" }}
        >
          {renderContent(activeArticle.content)}
        </div>
      </div>
    </ScrollArea>
  );
};

export default WikiContentPanel;
