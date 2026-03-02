import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { fieldsMatch } from "@/lib/wildcardMatch";

interface Option {
  value: string;
  label: string;
}

interface Props {
  label: string;
  options: Option[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}

const MultiSelectFilter = ({ label, options, selected, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Set<string>>(new Set(selected));
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 200 });
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuStyle({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(200, rect.width),
    });
  };

  // Sync draft when opening
  useEffect(() => {
    if (open) {
      setDraft(new Set(selected));
      updateMenuPosition();
    }
  }, [open, selected]);

  const portalContainer = (ref.current?.closest(".admin-tool") as HTMLElement | null) ?? document.body;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedTrigger = !!ref.current?.contains(target);
      const clickedMenu = !!menuRef.current?.contains(target);
      if (!clickedTrigger && !clickedMenu) setOpen(false);
    };

    const reposition = () => updateMenuPosition();

    document.addEventListener("mousedown", handler);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => fieldsMatch(q, o.label));
  }, [options, search]);

  const allSelected = draft.size === 0;
  const activeCount = selected.size;

  const toggle = (value: string) => {
    const next = new Set(draft);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setDraft(next);
  };

  const selectAll = () => setDraft(new Set());

  const applyAndClose = () => {
    onChange(draft);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--admin-muted-fg))] hover:text-[hsl(var(--admin-content-fg))]"
        style={{ color: activeCount > 0 ? "hsl(var(--admin-accent))" : undefined }}
      >
        {label}
        {activeCount > 0 && (
          <span
            className="inline-flex items-center justify-center h-3.5 min-w-[14px] px-1 rounded-full text-[9px] font-bold"
            style={{ background: "hsl(var(--admin-accent))", color: "hsl(var(--admin-accent-fg))" }}
          >
            {activeCount}
          </span>
        )}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed rounded border shadow-lg z-[140] max-h-[320px] flex flex-col"
          style={{
            background: "hsl(var(--admin-card))",
            borderColor: "hsl(var(--admin-border))",
            color: "hsl(var(--admin-content-fg))",
            top: menuStyle.top,
            left: menuStyle.left,
            minWidth: menuStyle.width,
          }}
        >
          {options.length > 8 && (
            <div className="p-1.5 border-b" style={{ borderColor: "hsl(var(--admin-border))" }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full text-xs px-2 py-1 rounded border outline-none bg-[hsl(var(--admin-content-bg))] text-[hsl(var(--admin-content-fg))]"
                style={{ borderColor: "hsl(var(--admin-border))" }}
                autoFocus
              />
            </div>
          )}
          <div className="overflow-auto flex-1">
            <label
              className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-[hsl(var(--admin-muted))] border-b"
              style={{ borderColor: "hsl(var(--admin-border))" }}
              onClick={selectAll}
            >
              <span
                className="flex items-center justify-center h-3.5 w-3.5 rounded border"
                style={{
                  borderColor: allSelected ? "hsl(var(--admin-accent))" : "hsl(var(--admin-border))",
                  background: allSelected ? "hsl(var(--admin-accent))" : "transparent",
                }}
              >
                {allSelected && <Check className="h-2.5 w-2.5 text-[hsl(var(--admin-accent-fg))]" />}
              </span>
              <span className="font-medium">Select All</span>
            </label>
            {filtered.map((opt) => {
              const checked = draft.has(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-[hsl(var(--admin-muted))]"
                  onClick={() => toggle(opt.value)}
                >
                  <span
                    className="flex items-center justify-center h-3.5 w-3.5 rounded border"
                    style={{
                      borderColor: checked ? "hsl(var(--admin-accent))" : "hsl(var(--admin-border))",
                      background: checked ? "hsl(var(--admin-accent))" : "transparent",
                    }}
                  >
                    {checked && <Check className="h-2.5 w-2.5 text-[hsl(var(--admin-accent-fg))]" />}
                  </span>
                  {opt.label}
                </label>
              );
            })}
          </div>
          <div className="flex justify-end gap-1 p-1.5 border-t" style={{ borderColor: "hsl(var(--admin-border))" }}>
            <button
              className="px-2.5 py-1 text-xs rounded hover:bg-[hsl(var(--admin-muted))] text-[hsl(var(--admin-accent))]"
              onClick={selectAll}
            >
              Clear
            </button>
            <button
              className="px-2.5 py-1 text-xs rounded"
              style={{ background: "hsl(var(--admin-accent))", color: "hsl(var(--admin-accent-fg))" }}
              onClick={applyAndClose}
            >
              OK
            </button>
          </div>
        </div>,
        portalContainer,
      )}
    </div>
  );
};

export default MultiSelectFilter;
