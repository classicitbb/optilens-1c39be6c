// Lists the fields a capture could not read with confidence, so nothing it
// guessed goes to the lab unseen. Each row jumps to its field; "Looks right"
// accepts the value as read. Editing a field clears its flag too.
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { flagLabel } from "./flags";
import type { RxFlag } from "../domain/schema";

export function FlagBanner({
  flags, onConfirm, onConfirmAll,
}: { flags: readonly RxFlag[]; onConfirm: (path: string) => void; onConfirmAll: () => void }) {
  if (!flags.length) return null;
  const go = (path: string) => {
    const el = document.querySelector<HTMLElement>(`[data-flag-path="${path}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  };
  return (
    <div className="mb-4 rounded-md border border-amber-400 bg-amber-50 p-3 text-xs text-amber-950 dark:bg-amber-950/30 dark:text-amber-100" role="status" data-testid="rx-flag-banner">
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <b>{flags.length} {flags.length === 1 ? "field needs" : "fields need"} a look</b>
        <span className="text-amber-900/80 dark:text-amber-100/80">— read from a photo or sheet; check against the original.</span>
        <Button type="button" variant="outline" size="sm" className="ml-auto h-7 text-[11px]" onClick={onConfirmAll}>All look right</Button>
      </div>
      <ul className="space-y-1">
        {flags.map((f) => (
          <li key={f.path} className="flex items-center gap-2">
            <button type="button" className="font-semibold underline-offset-2 hover:underline" onClick={() => go(f.path)}>{flagLabel(f.path)}</button>
            <span className="min-w-0 flex-1 truncate">{f.reason}</span>
            <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => onConfirm(f.path)}>Looks right</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
