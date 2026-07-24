import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface QuantityInputProps {
  quantity: number;
  onCommit: (quantity: number) => void;
  className?: string;
  "aria-label"?: string;
}

const QuantityInput = ({ quantity, onCommit, className, ...aria }: QuantityInputProps) => {
  const [value, setValue] = useState(String(quantity));

  useEffect(() => {
    setValue(String(quantity));
  }, [quantity]);

  const commit = () => {
    const parsed = Math.floor(Number(value));
    if (!Number.isFinite(parsed) || parsed < 1) {
      setValue(String(quantity));
      return;
    }
    if (parsed !== quantity) onCommit(parsed);
    setValue(String(parsed));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          setValue(String(quantity));
          e.currentTarget.blur();
        }
      }}
      className={cn(
        "w-10 rounded border border-transparent bg-transparent text-center tabular-nums text-sm font-semibold text-foreground transition-colors",
        "hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        className,
      )}
      {...aria}
    />
  );
};

export default QuantityInput;
