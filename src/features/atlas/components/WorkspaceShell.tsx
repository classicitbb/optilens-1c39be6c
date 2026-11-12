import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { PanelLeftOpen } from "lucide-react";
import { SIDEBAR_MAX, SIDEBAR_MIN } from "../hooks/useAtlasPrefs";

interface WorkspaceShellProps {
  sidebar: ReactNode;
  /** Right panel content; null keeps it closed. */
  panel: ReactNode | null;
  sidebarWidth: number;
  onSidebarWidthChange: (width: number) => void;
  sidebarCollapsed: boolean;
  onSidebarCollapsedChange: (collapsed: boolean) => void;
  children: ReactNode;
}

/** Set while the collapsed sidebar is shown floating on hover; `pin` keeps it open for good. */
export const SidebarPeekContext = createContext<{ peeking: boolean; pin: () => void }>({ peeking: false, pin: () => undefined });

/** Radix menus, popovers and dialogs portal to <body>; while one is open the peek stays. */
const floatingLayerOpen = () => Boolean(document.querySelector("[data-radix-popper-content-wrapper], [role='dialog'], [role='alertdialog']"));

/**
 * Three-pane workspace: resizable/collapsible sidebar, centre canvas, optional
 * right panel. Each pane scrolls on its own. Below 768px the side panes float
 * over the canvas instead of squeezing it.
 */
const WorkspaceShell = ({
  sidebar,
  panel,
  sidebarWidth,
  onSidebarWidthChange,
  sidebarCollapsed,
  onSidebarCollapsedChange,
  children,
}: WorkspaceShellProps) => {
  const dragging = useRef(false);
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // On narrow screens the side panes float over the canvas, so only one shows at a time.
  const showSidebar = !sidebarCollapsed && !(narrow && panel);

  // ⌘\ / Ctrl+\ toggles the sidebar.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "\\") {
        event.preventDefault();
        onSidebarCollapsedChange(!sidebarCollapsed);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarCollapsed, onSidebarCollapsedChange]);

  const startResize = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragging.current = true;
      const left = event.currentTarget.parentElement?.getBoundingClientRect().left ?? 0;
      const onMove = (move: PointerEvent) => {
        if (dragging.current) onSidebarWidthChange(move.clientX - left);
      };
      const onUp = () => {
        dragging.current = false;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [onSidebarWidthChange],
  );

  // Collapsed sidebar: hovering the left edge or the open button floats it over the page until the
  // pointer leaves (and no menu opened from it is still showing).
  const [peek, setPeek] = useState(false);
  const peekHover = useRef(false);
  const peekTimer = useRef<number | undefined>(undefined);
  const openPeek = () => {
    peekHover.current = true;
    window.clearTimeout(peekTimer.current);
    setPeek(true);
  };
  const leavePeek = () => {
    peekHover.current = false;
    window.clearTimeout(peekTimer.current);
    const check = () => {
      if (peekHover.current) return;
      if (floatingLayerOpen()) {
        peekTimer.current = window.setTimeout(check, 300);
        return;
      }
      setPeek(false);
    };
    peekTimer.current = window.setTimeout(check, 250);
  };
  useEffect(() => () => window.clearTimeout(peekTimer.current), []);
  useEffect(() => {
    if (!sidebarCollapsed) setPeek(false);
  }, [sidebarCollapsed]);
  const pinSidebar = useCallback(() => {
    setPeek(false);
    onSidebarCollapsedChange(false);
  }, [onSidebarCollapsedChange]);

  const onResizeKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") onSidebarWidthChange(sidebarWidth - 16);
    if (event.key === "ArrowRight") onSidebarWidthChange(sidebarWidth + 16);
  };

  return (
    <div className="relative flex h-full min-h-0 w-full overflow-hidden bg-ws-bg text-ws-ink">
      {showSidebar ? (
        <>
          <button
            type="button"
            aria-label="Close sidebar"
            className="absolute inset-0 z-20 bg-black/30 md:hidden"
            onClick={() => onSidebarCollapsedChange(true)}
          />
          <aside
            aria-label="Pages"
            style={{ width: sidebarWidth }}
            className="relative z-30 flex min-h-0 shrink-0 flex-col border-r border-[var(--ws-hover)] bg-ws-side max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:max-w-[85vw]"
          >
            {sidebar}
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize sidebar"
              aria-valuemin={SIDEBAR_MIN}
              aria-valuemax={SIDEBAR_MAX}
              aria-valuenow={sidebarWidth}
              tabIndex={0}
              onPointerDown={startResize}
              onKeyDown={onResizeKey}
              className="absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize after:absolute after:inset-y-0 after:left-[3px] after:w-0.5 hover:after:bg-[hsl(var(--ws-ink)/0.1)] focus-visible:after:bg-ws-accent max-md:hidden"
            />
          </aside>
        </>
      ) : (
        <>
          {!narrow ? <div aria-hidden className="absolute inset-y-0 left-0 z-30 w-3" onMouseEnter={openPeek} onMouseLeave={leavePeek} /> : null}
          <button
            type="button"
            onClick={pinSidebar}
            onMouseEnter={narrow ? undefined : openPeek}
            onMouseLeave={narrow ? undefined : leavePeek}
            aria-label="Open sidebar (Ctrl+\)"
            title="Open sidebar"
            className="absolute left-2 top-2 z-40 flex h-7 w-7 items-center justify-center rounded-[6px] text-ws-ink-2 hover:bg-[var(--ws-hover)]"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
          {peek && !narrow ? (
            <SidebarPeekContext.Provider value={{ peeking: true, pin: pinSidebar }}>
              <aside
                aria-label="Pages"
                style={{ width: sidebarWidth }}
                onMouseEnter={openPeek}
                onMouseLeave={leavePeek}
                className="group/sidebar absolute bottom-12 left-0 top-12 z-50 flex min-h-0 flex-col rounded-r-[10px] bg-ws-side shadow-[var(--ws-float-shadow)]"
              >
                {sidebar}
              </aside>
            </SidebarPeekContext.Provider>
          ) : null}
        </>
      )}

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>

      {panel ? (
        <aside
          aria-label="Page panel"
          className="z-30 flex min-h-0 w-[340px] shrink-0 flex-col border-l border-ws-line bg-ws-paper max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:w-[min(340px,100vw)]"
        >
          {panel}
        </aside>
      ) : null}
    </div>
  );
};

export default WorkspaceShell;
