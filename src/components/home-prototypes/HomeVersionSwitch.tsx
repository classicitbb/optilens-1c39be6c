import { FlaskConical } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { setHomeVersion, useHomeVersion } from "@/components/home-prototypes/homeVersionStore";

/**
 * Admin-only control for previewing the homepage prototype.
 * Rendered inside the account dropdown alongside the appearance switch.
 */
const HomeVersionSwitch = () => {
  const version = useHomeVersion();

  return (
    <div className="rounded-xl px-2.5 py-2 text-foreground outline-none ring-0 transition-colors hover:bg-accent/50 focus-within:bg-accent/70">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-4.5 w-4.5 text-foreground/80" />
          <div>
            <p className="text-sm font-medium leading-none">Homepage version</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {version === "a" ? "A — live homepage" : "B — prototype (admin preview)"}
            </p>
          </div>
        </div>
        <ToggleGroup
          type="single"
          value={version}
          onValueChange={(value) => {
            if (value === "a" || value === "b") setHomeVersion(value);
          }}
          aria-label="Homepage version"
          className="w-full justify-start rounded-full border border-border/70 bg-muted/60 p-0.5 sm:w-auto sm:justify-center"
        >
          {(["a", "b"] as const).map((option) => (
            <ToggleGroupItem
              key={option}
              value={option}
              aria-label={option === "a" ? "Version A (live)" : "Version B (prototype)"}
              className={cn(
                "h-7 w-9 flex-1 rounded-full border-0 px-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground shadow-none hover:bg-background/80 hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm sm:flex-none",
                version === option && "ring-1 ring-border/60",
              )}
            >
              {option.toUpperCase()}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
};

export default HomeVersionSwitch;
