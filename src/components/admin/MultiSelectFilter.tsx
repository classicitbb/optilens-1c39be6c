import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check } from "lucide-react";

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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const allSelected = selected.size === 0; // empty = no filter = all
  const activeCount = selected.size;

  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  const selectAll = () => onChange(new Set());

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

      {open && (
        <div
          className="absolute top-full left-0 mt-1 rounded border shadow-lg z-50 min-w-[200px] max-h-[320px] flex flex-col"
          style={{ background: "hsl(0 0% 100%)", borderColor: "hsl(215 15% 85%)" }}
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
              const checked = selected.has(opt.value);
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
              onClick={() => setOpen(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectFilter;
