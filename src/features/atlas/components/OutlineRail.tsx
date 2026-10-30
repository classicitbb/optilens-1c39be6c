import { useEffect, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";

interface OutlineItem {
  el: HTMLElement;
  level: number;
  text: string;
}

const HEADINGS = "h1, h2, h3, h4";

/**
 * On-page contents rail built from the rendered headings (editor or reader), so it needs no schema.
 * Hidden below 1500px and when the page has fewer than two headings.
 */
const OutlineRail = ({ rootRef }: { rootRef: RefObject<HTMLElement | null> }) => {
  const [items, setItems] = useState<OutlineItem[]>([]);
  const [active, setActive] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let frame = 0;
    const scan = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = Array.from(root.querySelectorAll<HTMLElement>(HEADINGS))
          .filter((el) => !el.closest("[data-outline-ignore]") && el.textContent?.trim())
          .map((el) => ({ el, level: Number(el.tagName[1]), text: el.textContent!.trim() }));
        setItems((current) =>
          current.length === next.length && current.every((item, index) => item.el === next[index].el && item.text === next[index].text) ? current : next,
        );
      });
    };
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [rootRef]);

  useEffect(() => {
    if (items.length < 2) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target as HTMLElement);
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    items.forEach((item) => observer.observe(item.el));
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;
  const minLevel = Math.min(...items.map((item) => item.level));

  return (
    <nav aria-label="On this page" className="pointer-events-none absolute inset-y-0 left-full hidden w-48 pl-2 min-[1500px]:block">
      <div className="pointer-events-auto sticky top-16 max-h-[70vh] overflow-y-auto py-2">
        <p className="ws-label px-2 pb-1 text-[10px] text-ws-ink-3">On this page</p>
        <ul>
          {items.map((item, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => item.el.scrollIntoView({ behavior: "smooth", block: "start" })}
                style={{ paddingLeft: 8 + (item.level - minLevel) * 12 }}
                className={cn(
                  "block w-full truncate rounded-[4px] py-1 pr-2 text-left text-[13px] text-ws-ink-3 hover:bg-[var(--ws-hover)] hover:text-ws-ink",
                  active === item.el && "text-ws-accent",
                )}
              >
                {item.text}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default OutlineRail;
