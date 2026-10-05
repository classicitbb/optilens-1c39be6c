import { useEffect, useMemo, useState } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { FilePlus2, FileText, Globe, Search, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { searchDocs, type SearchDoc } from "./paletteSearch";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docs: SearchDoc[];
  onOpenDoc: (doc: SearchDoc) => void;
  onNewPage: () => void;
  onOpenWebsiteContent: () => void;
  onAskIris: () => void;
}

const itemClass =
  "flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-2 text-[14px] text-ws-ink-2 data-[selected=true]:bg-ws-side-hover data-[selected=true]:text-ws-ink";

/** ⌘K: searches page titles, block text and website content. */
const CommandPalette = ({
  open,
  onOpenChange,
  docs,
  onOpenDoc,
  onNewPage,
  onOpenWebsiteContent,
  onAskIris,
}: CommandPaletteProps) => {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const hits = useMemo(() => searchDocs(docs, query), [docs, query]);
  const close = (action: () => void) => () => {
    onOpenChange(false);
    action();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Search pages</DialogTitle>
        <DialogDescription className="sr-only">Search page titles, text and website content, or run a command.</DialogDescription>
        <CommandPrimitive
          shouldFilter={false}
          loop
          className="flex max-h-[60vh] w-full flex-col overflow-hidden bg-ws-paper text-ws-ink"
        >
          <div className="flex items-center gap-2 border-b border-ws-line px-3">
            <Search className="h-4 w-4 shrink-0 text-ws-ink-3" />
            <CommandPrimitive.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search pages, text and website content…"
              className="ws-bare-input h-12 w-full bg-transparent text-[14px] outline-none placeholder:text-ws-ink-3"
            />
          </div>
          <CommandPrimitive.List className="min-h-0 flex-1 overflow-y-auto p-2">
            {query.trim() === "" ? (
              <CommandPrimitive.Group heading="Quick actions">
                <CommandPrimitive.Item className={itemClass} onSelect={close(onNewPage)}>
                  <FilePlus2 className="h-4 w-4" /> New page
                </CommandPrimitive.Item>
                <CommandPrimitive.Item className={itemClass} onSelect={close(onOpenWebsiteContent)}>
                  <Globe className="h-4 w-4" /> Open website content
                </CommandPrimitive.Item>
                <CommandPrimitive.Item className={itemClass} onSelect={close(onAskIris)}>
                  <Sparkles className="h-4 w-4" /> Ask Iris
                </CommandPrimitive.Item>
              </CommandPrimitive.Group>
            ) : hits.length === 0 ? (
              <CommandPrimitive.Empty className="px-2 py-6 text-center text-[14px] text-ws-ink-3">
                No results for “{query.trim()}”.
              </CommandPrimitive.Empty>
            ) : (
              hits.map((hit) => (
                <CommandPrimitive.Item
                  key={`${hit.kind}:${hit.id}`}
                  value={`${hit.kind}:${hit.id}`}
                  className={cn(itemClass, "items-start")}
                  onSelect={close(() => onOpenDoc(hit))}
                >
                  {hit.kind === "website" ? <Globe className="mt-0.5 h-4 w-4 shrink-0" /> : <FileText className="mt-0.5 h-4 w-4 shrink-0" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{hit.title}</span>
                    {hit.snippet ? <span className="block truncate text-[12px] text-ws-ink-3">{hit.snippet}</span> : null}
                  </span>
                  {hit.meta ? <span className="ws-label shrink-0 text-[10px] text-ws-ink-3">{hit.meta}</span> : null}
                </CommandPrimitive.Item>
              ))
            )}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;
