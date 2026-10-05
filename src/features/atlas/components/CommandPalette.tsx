import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Command as CommandPrimitive } from "cmdk";
import { FileText, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { AtlasHit } from "../source/types";

export interface PaletteAction {
  id: string;
  label: string;
  icon: ReactNode;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The one search source (`AtlasSource.search`), already limited to spaces the user can read. */
  search: (query: string) => Promise<AtlasHit[]>;
  spaceLabel: (spaceId: string) => string;
  onOpenHit: (hit: AtlasHit) => void;
  actions: PaletteAction[];
  placeholder: string;
}

const itemClass =
  "flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-2 text-[14px] text-ws-ink-2 data-[selected=true]:bg-ws-side-hover data-[selected=true]:text-ws-ink";

/** ⌘K: searches titles and body text across every space. */
const CommandPalette = ({ open, onOpenChange, search, spaceLabel, onOpenHit, actions, placeholder }: CommandPaletteProps) => {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { data: hits = [], isFetching } = useQuery({
    queryKey: ["atlas", "palette", debounced],
    queryFn: () => search(debounced),
    enabled: open && debounced.length > 1,
    staleTime: 30_000,
  });

  const close = (action: () => void) => () => {
    onOpenChange(false);
    action();
  };
  const searching = query.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">Search page titles and text across every space, or run a command.</DialogDescription>
        <CommandPrimitive shouldFilter={false} loop className="flex max-h-[60vh] w-full flex-col overflow-hidden bg-ws-paper text-ws-ink">
          <div className="flex items-center gap-2 border-b border-ws-line px-3">
            <Search className="h-4 w-4 shrink-0 text-ws-ink-3" />
            <CommandPrimitive.Input
              value={query}
              onValueChange={setQuery}
              placeholder={placeholder}
              className="ws-bare-input h-12 w-full bg-transparent text-[14px] outline-none placeholder:text-ws-ink-3"
            />
          </div>
          <CommandPrimitive.List className="min-h-0 flex-1 overflow-y-auto p-2">
            {!searching ? (
              <CommandPrimitive.Group heading="Quick actions">
                {actions.map((action) => (
                  <CommandPrimitive.Item key={action.id} className={itemClass} onSelect={close(action.run)}>
                    {action.icon} {action.label}
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>
            ) : hits.length === 0 ? (
              <CommandPrimitive.Empty className="px-2 py-6 text-center text-[14px] text-ws-ink-3">
                {isFetching || debounced !== query.trim() ? "Searching…" : `No results for “${query.trim()}”.`}
              </CommandPrimitive.Empty>
            ) : (
              hits.map((hit) => (
                <CommandPrimitive.Item
                  key={hit.pageId}
                  value={hit.pageId}
                  className={cn(itemClass, "items-start")}
                  onSelect={close(() => onOpenHit(hit))}
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{hit.title}</span>
                    {hit.snippet ? <span className="block truncate text-[12px] text-ws-ink-3">{hit.snippet}</span> : null}
                  </span>
                  <span className="ws-label shrink-0 text-[10px] text-ws-ink-3">{spaceLabel(hit.spaceId)}</span>
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
