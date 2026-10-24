import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { SuggestionProps } from "@tiptap/suggestion";
import { cn } from "@/lib/utils";
import type { SuggestionBridge } from "./extensions";

interface MenuState<TItem> {
  items: TItem[];
  rect: DOMRect | null;
  command: (item: TItem) => void;
}

/**
 * Connects a Tiptap suggestion plugin to React state. The returned `bridge` is
 * stable, so it can be passed into the extension once; `state` drives the popup.
 */
export function useSuggestionBridge<TItem>() {
  const [state, setState] = useState<MenuState<TItem> | null>(null);
  const [selected, setSelected] = useState(0);
  const stateRef = useRef<MenuState<TItem> | null>(null);
  const selectedRef = useRef(0);

  const choose = useCallback((index: number) => {
    selectedRef.current = index;
    setSelected(index);
  }, []);

  const apply = useCallback(
    (props: SuggestionProps<TItem, TItem>, reset: boolean) => {
      const next: MenuState<TItem> = {
        items: props.items,
        rect: props.clientRect?.() ?? null,
        command: (item) => props.command(item),
      };
      stateRef.current = next;
      setState(next);
      if (reset) choose(0);
      else if (selectedRef.current >= props.items.length) choose(Math.max(0, props.items.length - 1));
    },
    [choose],
  );

  const bridge = useMemo<SuggestionBridge<TItem>>(
    () => ({
      onStart: (props) => apply(props, true),
      onUpdate: (props) => apply(props, true),
      onKeyDown: (event) => {
        const current = stateRef.current;
        if (!current || current.items.length === 0) return false;
        const count = current.items.length;
        if (event.key === "ArrowDown") {
          choose((selectedRef.current + 1) % count);
          return true;
        }
        if (event.key === "ArrowUp") {
          choose((selectedRef.current - 1 + count) % count);
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          current.command(current.items[selectedRef.current]);
          return true;
        }
        return false;
      },
      onExit: () => {
        stateRef.current = null;
        setState(null);
      },
    }),
    [apply, choose],
  );

  return { bridge, state, selected, setSelected: choose };
}

interface SuggestionPopupProps<TItem> {
  state: MenuState<TItem> | null;
  selected: number;
  onHover: (index: number) => void;
  label: string;
  empty: string;
  renderItem: (item: TItem, index: number, selected: boolean) => ReactNode;
  /** Heading shown above an item when it starts a new group. */
  groupOf?: (item: TItem) => string;
}

export function SuggestionPopup<TItem>({ state, selected, onHover, label, empty, renderItem, groupOf }: SuggestionPopupProps<TItem>) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [selected, state?.items]);

  if (!state || !state.rect) return null;

  const { rect } = state;
  const spaceBelow = window.innerHeight - rect.bottom;
  const above = spaceBelow < 280 && rect.top > spaceBelow;
  const style = {
    position: "fixed" as const,
    left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)),
    ...(above ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
    maxHeight: Math.min(320, (above ? rect.top : spaceBelow) - 16),
  };

  return createPortal(
    <div
      ref={listRef}
      role="listbox"
      aria-label={label}
      style={style}
      className="ws-suggestion-popup z-[9300] w-72 overflow-y-auto rounded-[8px] border border-ws-line bg-ws-paper p-1 text-ws-ink"
      onMouseDown={(event) => event.preventDefault()}
    >
      {state.items.length === 0 ? <p className="px-2 py-3 text-[13px] text-ws-ink-3">{empty}</p> : null}
      {state.items.map((item, index) => {
        const group = groupOf?.(item);
        const heading = group && (index === 0 || groupOf?.(state.items[index - 1]) !== group) ? group : null;
        return (
          <div key={index} role="presentation">
            {heading ? <p className="ws-label px-2 pb-1 pt-2 text-[10px] text-ws-ink-3">{heading}</p> : null}
            <div
              role="option"
              aria-selected={index === selected}
              data-selected={index === selected}
              onMouseEnter={() => onHover(index)}
              onClick={() => state.command(item)}
              className={cn("flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-[14px]", index === selected && "bg-ws-side-hover")}
            >
              {renderItem(item, index, index === selected)}
            </div>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
