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

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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
        className="flex items-center gap-1 hover:text-foreground text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: activeCount > 0 ? "hsl(215 65% 50%)" : undefined }}
      >
        {label}
        {activeCount > 0 && (
          <span
            className="inline-flex items-center justify-center h-3.5 min-w-[14px] px-1 rounded-full text-[9px] font-bold"
            style={{ background: "hsl(215 65% 50%)", color: "white" }}
          >
            {activeCount}
          </span>
        )}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && createPortal(
        <div
          className="fixed rounded border shadow-lg z-[140] max-h-[320px] flex flex-col"
          style={{
            background: "hsl(0 0% 100%)",
            borderColor: "hsl(215 15% 85%)",
            top: menuStyle.top,
            left: menuStyle.left,
            minWidth: menuStyle.width,
          }}
        >
          {options.length > 8 && (
            <div className="p-1.5 border-b" style={{ borderColor: "hsl(215 15% 90%)" }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full text-xs px-2 py-1 rounded border outline-none"
                style={{ borderColor: "hsl(215 15% 85%)" }}
                autoFocus
              />
            </div>
          )}
          <div className="overflow-auto flex-1">
            <label
              className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-blue-50/60 border-b"
              style={{ borderColor: "hsl(215 15% 92%)" }}
            >
              <span
                className="flex items-center justify-center h-3.5 w-3.5 rounded border"
                style={{
                  borderColor: allSelected ? "hsl(215 65% 50%)" : "hsl(215 15% 75%)",
                  background: allSelected ? "hsl(215 65% 50%)" : "transparent",
                }}
              >
                {allSelected && <Check className="h-2.5 w-2.5 text-white" />}
              </span>
              <span className="font-medium">Select All</span>
            </label>
            {filtered.map((opt) => {
              const checked = draft.has(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-blue-50/60"
                  onClick={() => toggle(opt.value)}
                >
                  <span
                    className="flex items-center justify-center h-3.5 w-3.5 rounded border"
                    style={{
                      borderColor: checked ? "hsl(215 65% 50%)" : "hsl(215 15% 75%)",
                      background: checked ? "hsl(215 65% 50%)" : "transparent",
                    }}
                  >
                    {checked && <Check className="h-2.5 w-2.5 text-white" />}
                  </span>
                  {opt.label}
                </label>
              );
            })}
          </div>
          <div className="flex justify-end gap-1 p-1.5 border-t" style={{ borderColor: "hsl(215 15% 90%)" }}>
            <button
              className="px-2.5 py-1 text-xs rounded hover:bg-blue-50"
              style={{ color: "hsl(215 65% 50%)" }}
              onClick={selectAll}
            >
              Clear
            </button>
            <button
              className="px-2.5 py-1 text-xs rounded"
              style={{ background: "hsl(215 65% 50%)", color: "white" }}
              onClick={applyAndClose}
            >
              OK
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default MultiSelectFilter;
