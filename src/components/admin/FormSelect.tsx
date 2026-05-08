import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  nullable?: boolean;
  className?: string;
}

const FormSelect = ({ value, onChange, options, placeholder = "Select…", disabled, nullable, className }: Props) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState(value);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 220 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  const updateMenuPosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuH = 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= menuH ? rect.bottom + 2 : rect.top - menuH - 2;
    setMenuStyle({
      top: Math.max(4, top),
      left: rect.left,
      width: Math.max(200, rect.width),
    });
  };

  useEffect(() => {
    if (open) {
      setDraft(value);
      setSearch("");
      updateMenuPosition();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
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
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const applyAndClose = () => {
    onChange(draft);
    setOpen(false);
  };

  const clear = () => setDraft("");

  return (
    <div className={`relative ${className ?? ""}`}>
      <button
        type="button"
        ref={triggerRef}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className="h-7 w-full flex items-center justify-between gap-1 px-2 text-xs rounded border border-input bg-background hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selectedLabel ? "truncate" : "truncate text-muted-foreground"}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
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
            maxHeight: 280,
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
            {filtered.map((opt) => {
              const checked = draft === opt.value;
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer"
                  style={{ background: checked ? "hsl(var(--admin-accent) / 0.08)" : undefined }}
                  onClick={() => setDraft(opt.value)}
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
                </label>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-center" style={{ color: "hsl(var(--admin-muted-fg))" }}>
                No results
              </div>
            )}
          </div>
          <div className="flex justify-end gap-1 p-1.5 border-t" style={{ borderColor: "hsl(var(--admin-border))" }}>
            {nullable && (
              <button
                className="px-2.5 py-1 text-xs rounded"
                style={{ color: "hsl(var(--admin-accent))" }}
                onClick={clear}
              >
                Clear
              </button>
            )}
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

export default FormSelect;
