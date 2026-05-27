import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  searchable?: boolean;
}

const FormSelect = ({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled,
  nullable,
  className,
  searchable = false,
}: Props) => {
  const selectedLabel = useMemo(
    () => options.find((option) => option.value === value)?.label ?? "",
    [options, value],
  );
  const [searchText, setSearchText] = useState(selectedLabel);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setSearchText(selectedLabel);
  }, [selectedLabel]);

  if (searchable) {
    const normalizedQuery = searchText.trim().toLowerCase();
    const filteredOptions = options.filter((option) => {
      if (!normalizedQuery) return true;
      return (
        option.label.toLowerCase().includes(normalizedQuery) ||
        option.value.toLowerCase().includes(normalizedQuery)
      );
    });

    const resolveValue = (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return nullable ? "" : value;
      const exactLabel = options.find((option) => option.label.toLowerCase() === trimmed.toLowerCase());
      if (exactLabel) return exactLabel.value;
      const exactValue = options.find((option) => option.value.toLowerCase() === trimmed.toLowerCase());
      return exactValue?.value ?? null;
    };

    const commitSearch = (raw: string) => {
      const nextValue = resolveValue(raw);
      if (nextValue === null) {
        setSearchText(selectedLabel);
        setSearchOpen(false);
        return;
      }
      onChange(nextValue);
      setSearchText(options.find((option) => option.value === nextValue)?.label ?? "");
      setSearchOpen(false);
    };

    const selectOption = (optionValue: string) => {
      onChange(optionValue);
      setSearchText(options.find((option) => option.value === optionValue)?.label ?? "");
      setSearchOpen(false);
    };

    return (
      <div className={`relative ${className ?? ""}`}>
        <input
          type="search"
          value={searchText}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => {
            const nextText = event.target.value;
            setSearchText(nextText);
            setSearchOpen(true);
            const nextValue = resolveValue(nextText);
            if (nextValue !== null && nextValue !== value) onChange(nextValue);
            if (nextText === "" && nullable && value !== "") onChange("");
          }}
          onFocus={() => setSearchOpen(true)}
          onBlur={(event) => commitSearch(event.target.value)}
          className="h-7 w-full rounded-md border border-input bg-background px-2 pr-7 text-xs text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {searchOpen && !disabled ? (
          <div className="absolute left-0 right-0 top-full z-[9500] mt-1 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg">
            <div className="max-h-56 overflow-y-auto py-1">
              {nullable ? (
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption("")}
                  className={`block w-full px-2 py-1 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground ${
                    value === "" ? "bg-accent/70 text-accent-foreground" : ""
                  }`}
                >
                  None
                </button>
              ) : null}
              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(option.value)}
                  className={`block w-full px-2 py-1 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground ${
                    option.value === value ? "bg-accent/70 text-accent-foreground" : ""
                  }`}
                >
                  {option.label}
                </button>
              ))}
              {filteredOptions.length === 0 ? (
                <div className="px-2 py-1 text-xs text-muted-foreground">No matches found</div>
              ) : null}
            </div>
          </div>
        ) : null}
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-7 w-full appearance-none rounded-md border border-input bg-background px-2 pr-7 text-xs text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {nullable ? <option value="">{placeholder === "None" ? "None" : `None${placeholder ? ` (${placeholder})` : ""}`}</option> : null}
        {!nullable && !value ? <option value="" disabled>{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
};

export default FormSelect;
