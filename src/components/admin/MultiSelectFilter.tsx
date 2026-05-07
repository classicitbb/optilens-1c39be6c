import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Star } from "lucide-react";
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
  storageKey?: string; // enables per-column frequency tracking
}

// ── Frequency helpers ─────────────────────────────────────────────────────────

function loadFreq(key: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(`mf_freq_${key}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveFreq(key: string, freq: Record<string, number>) {
  try { localStorage.setItem(`mf_freq_${key}`, JSON.stringify(freq)); } catch { /* ignore */ }
}

function recordSelections(key: string, values: Set<string>) {
  if (!key || values.size === 0) return;
  const freq = loadFreq(key);
  for (const v of values) {
    freq[v] = (freq[v] ?? 0) + 1;
  }
  saveFreq(key, freq);
}

const FREQ_THRESHOLD = 2; // min selections before pinning to top

// ─────────────────────────────────────────────────────────────────────────────

const MultiSelectFilter = ({ label, options, selected, onChange, storageKey }: Props) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Set<string>>(new Set(selected));
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 200 });
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const menuH = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= menuH ? rect.bottom + 4 : rect.top - menuH - 4;
    setMenuStyle({
      top: Math.max(4, top),
      left: rect.left,
      width: Math.max(200, rect.width),
    });
  };

  useEffect(() => {
    if (open) {
      setDraft(new Set(selected));
      updateMenuPosition();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!ref.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
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

  // Sort: pinned (frequent) first, then alphabetical
  const sortedOptions = useMemo(() => {
    if (!storageKey) return options;
    const freq = loadFreq(storageKey);
    const pinned = options.filter((o) => (freq[o.value] ?? 0) >= FREQ_THRESHOLD)
      .sort((a, b) => (freq[b.value] ?? 0) - (freq[a.value] ?? 0));
    const rest = options.filter((o) => (freq[o.value] ?? 0) < FREQ_THRESHOLD);
    return [...pinned, ...rest];
  }, [options, storageKey, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pinnedCount = useMemo(() => {
    if (!storageKey) return 0;
    const freq = loadFreq(storageKey);
    return options.filter((o) => (freq[o.value] ?? 0) >= FREQ_THRESHOLD).length;
  }, [options, storageKey, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!search) return sortedOptions;
    const q = search.toLowerCase();
    return sortedOptions.filter((o) => fieldsMatch(q, o.label));
  }, [sortedOptions, search]);

  const allSelected = draft.size === 0;
  const activeCount = selected.size;

  const toggle = (value: string) => {
    const next = new Set(draft);
    if (next.has(value)) next.delete(value); else next.add(value);
    setDraft(next);
  };

  const selectAll = () => setDraft(new Set());

  const applyAndClose = () => {
    if (storageKey) recordSelections(storageKey, draft);
    onChange(draft);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: activeCount > 0 ? "hsl(var(--admin-accent))" : "hsl(var(--admin-muted-fg))" }}
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
          className="admin-tool dark fixed rounded flex flex-col"
          style={{
            background: "hsl(var(--admin-card))",
            border: "1.5px solid hsl(var(--admin-muted-fg) / 0.35)",
            boxShadow: "0 4px 24px hsl(0 0% 0% / 0.55), 0 0 0 1px hsl(var(--admin-muted-fg) / 0.12)",
            color: "hsl(var(--admin-content-fg))",
            top: menuStyle.top,
            left: menuStyle.left,
            minWidth: menuStyle.width,
            maxHeight: 320,
            zIndex: 99999,
          }}
        >
          {options.length > 6 && (
            <div className="p-1.5 border-b" style={{ borderColor: "hsl(var(--admin-border))" }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full text-xs px-2 py-1 rounded border outline-none"
                style={{
                  background: "hsl(var(--admin-content-bg))",
                  color: "hsl(var(--admin-content-fg))",
                  borderColor: "hsl(var(--admin-border))",
                }}
                autoFocus
              />
            </div>
          )}
          <div className="overflow-auto flex-1">
            <label
              className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer border-b"
              style={{ borderColor: "hsl(var(--admin-border))" }}
              onClick={selectAll}
            >
              <span
                className="flex items-center justify-center h-3.5 w-3.5 rounded border shrink-0"
                style={{
                  borderColor: allSelected ? "hsl(var(--admin-accent))" : "hsl(var(--admin-border))",
                  background: allSelected ? "hsl(var(--admin-accent))" : "transparent",
                }}
              >
                {allSelected && <Check className="h-2.5 w-2.5" style={{ color: "hsl(var(--admin-accent-fg))" }} />}
              </span>
              <span className="font-medium">Select All</span>
            </label>
            {filtered.map((opt, i) => {
              const checked = draft.has(opt.value);
              const isPinned = storageKey && i < pinnedCount && !search;
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer"
                  style={{ background: checked ? "hsl(var(--admin-accent) / 0.08)" : undefined }}
                  onClick={() => toggle(opt.value)}
                >
                  <span
                    className="flex items-center justify-center h-3.5 w-3.5 rounded border shrink-0"
                    style={{
                      borderColor: checked ? "hsl(var(--admin-accent))" : "hsl(var(--admin-border))",
                      background: checked ? "hsl(var(--admin-accent))" : "transparent",
                    }}
                  >
                    {checked && <Check className="h-2.5 w-2.5" style={{ color: "hsl(var(--admin-accent-fg))" }} />}
                  </span>
                  <span className="flex-1 leading-tight">{opt.label}</span>
                  {isPinned && (
                    <Star className="h-2.5 w-2.5 shrink-0" style={{ color: "hsl(var(--admin-accent))" }} />
                  )}
                </label>
              );
            })}
          </div>
          <div className="flex justify-end gap-1 p-1.5 border-t" style={{ borderColor: "hsl(var(--admin-border))" }}>
            <button
              className="px-2.5 py-1 text-xs rounded"
              style={{ color: "hsl(var(--admin-accent))" }}
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
        document.body,
      )}
    </div>
  );
};

export default MultiSelectFilter;
