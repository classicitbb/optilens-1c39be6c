import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatPlain,
  formatSignedPower,
  parsePlainNumber,
  parseRxPower,
} from "@/features/lenses/rxFormat";

/**
 * Signed prescription-power field (SPH / CYL / ADD).
 *
 * - Renders as type="text" so there are no native increment/spinner buttons.
 * - Always displays an explicit +/- sign and 2 decimals (e.g. +2.50, -0.75).
 * - Accepts typed +/- values and snaps to 0.25 D steps on commit.
 * - Pass allowNegative={false} for ADD (plus-only); a typed negative folds to
 *   its positive magnitude.
 */
type RxPowerInputProps = {
  id: string;
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  allowNegative?: boolean;
  debounceMs?: number;
  className?: string;
  ariaLabel?: string;
};

export const RxPowerInput = ({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 0.25,
  allowNegative = true,
  debounceMs = 220,
  className,
  ariaLabel,
}: RxPowerInputProps) => {
  const [draft, setDraft] = useState(() => formatSignedPower(value));
  const [isEditing, setIsEditing] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  // Reflect external value changes while the user is not actively editing.
  useEffect(() => {
    if (!isEditing) setDraft(formatSignedPower(value));
  }, [value, isEditing]);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  const commit = (raw: string) => {
    const parsed = parseRxPower(raw, { min, max, step, allowNegative });
    if (parsed !== null) onChange(parsed);
  };

  return (
    <div>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <Input
        id={id}
        type="text"
        inputMode="text"
        autoComplete="off"
        aria-label={ariaLabel ?? label}
        value={draft}
        className={className}
        onFocus={(event) => {
          setIsEditing(true);
          // Select the current text so the next keystroke replaces it instead of
          // inserting alongside it.
          event.currentTarget.select();
        }}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
          timeoutRef.current = window.setTimeout(() => commit(raw), debounceMs);
        }}
        onBlur={(event) => {
          if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
          setIsEditing(false);
          const parsed = parseRxPower(event.target.value, { min, max, step, allowNegative });
          if (parsed !== null) {
            onChange(parsed);
            setDraft(formatSignedPower(parsed));
          } else {
            setDraft(formatSignedPower(value));
          }
        }}
      />
    </div>
  );
};

/**
 * Unsigned numeric field (AXIS, PD, frame dimensions).
 *
 * - Renders as type="text" so there are no native increment/spinner buttons.
 * - Snaps to the configured step (or integer) and clamps to [min, max], unless
 *   wrapModulo is set (AXIS), in which case the value wraps into (0, modulo].
 */
type RxNumberInputProps = {
  id: string;
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  integer?: boolean;
  decimals?: number;
  wrapModulo?: number;
  debounceMs?: number;
  className?: string;
  ariaLabel?: string;
};

export const RxNumberInput = ({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  integer = false,
  decimals = 0,
  wrapModulo,
  debounceMs = 220,
  className,
  ariaLabel,
}: RxNumberInputProps) => {
  const [draft, setDraft] = useState(() => formatPlain(value, decimals));
  const [isEditing, setIsEditing] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEditing) setDraft(formatPlain(value, decimals));
  }, [value, decimals, isEditing]);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  const commit = (raw: string) => {
    const parsed = parsePlainNumber(raw, { min, max, step, integer, wrapModulo });
    if (parsed !== null) onChange(parsed);
  };

  return (
    <div>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <Input
        id={id}
        type="text"
        inputMode={integer ? "numeric" : "decimal"}
        autoComplete="off"
        aria-label={ariaLabel ?? label}
        value={draft}
        className={className}
        onFocus={(event) => {
          setIsEditing(true);
          // Select the current text so the next keystroke replaces it.
          event.currentTarget.select();
        }}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
          timeoutRef.current = window.setTimeout(() => commit(raw), debounceMs);
        }}
        onBlur={(event) => {
          if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
          setIsEditing(false);
          const parsed = parsePlainNumber(event.target.value, { min, max, step, integer, wrapModulo });
          if (parsed !== null) {
            onChange(parsed);
            setDraft(formatPlain(parsed, decimals));
          } else {
            setDraft(formatPlain(value, decimals));
          }
        }}
      />
    </div>
  );
};
