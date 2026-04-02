import { cn } from "@/lib/utils";
import type { CanvasPage } from "../types";

interface Props {
  pages: CanvasPage[];
  activePageId: string | null;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
}

const PageThumbnailsSidebar = ({ pages, activePageId, onSelectPage, onAddPage }: Props) => {
  return (
    <div className="w-[136px] border-r flex flex-col bg-background shrink-0">
      <div className="px-2.5 py-2 border-b flex items-center justify-between">
        <span className="text-[10px] font-medium tracking-wider uppercase text-muted-foreground">Pages</span>
        <span className="text-[10px] text-muted-foreground">{pages.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {pages.map((page) => (
          <div key={page.id} className="cursor-pointer" onClick={() => onSelectPage(page.id)}>
            <div
              className={cn(
                "rounded overflow-hidden border-[1.5px] transition-all",
                activePageId === page.id
                  ? "border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]"
                  : "border-border hover:border-muted-foreground/30"
              )}
            >
              <div className="w-full aspect-[0.7071] bg-muted/30 relative flex items-center justify-center">
                <svg viewBox="0 0 100 141" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <rect width="100" height="141" fill="hsl(var(--background))" />
                  {/* Simplified page preview */}
                  <rect x="5" y="5" width="90" height="14" rx="2" className="fill-muted" />
                  <rect x="8" y="8" width="30" height="4" rx="1" className="fill-muted-foreground/30" />
                  <rect x="5" y="23" width="90" height="40" rx="2" className="fill-muted/50" stroke="hsl(var(--border))" strokeWidth="0.5" />
                  <rect x="8" y="26" width="25" height="3" rx="1" className="fill-primary/60" />
                  <rect x="8" y="32" width="60" height="2" rx="1" className="fill-muted-foreground/20" />
                  <rect x="8" y="37" width="50" height="2" rx="1" className="fill-muted-foreground/20" />
                  <rect x="8" y="42" width="55" height="2" rx="1" className="fill-muted-foreground/20" />
                  <rect x="5" y="130" width="90" height="7" rx="1" className="fill-muted" />
                </svg>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground text-center pt-1">{page.page_number}</div>
          </div>
        ))}
        <button
          onClick={onAddPage}
          className="w-full border-[1.5px] border-dashed rounded py-2.5 text-center text-[11px] text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
        >
          + Add page
        </button>
      </div>
    </div>
  );
};

export default PageThumbnailsSidebar;
