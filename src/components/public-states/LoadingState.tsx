import { useDelayedBusy } from "@/hooks/useDelayedBusy";

export function LoadingState({ label = "Loading page matches", slow: forceSlow = false }: { label?: string; slow?: boolean }) {
  const slow = useDelayedBusy(true);
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5 text-foreground">
      <p className="text-sm font-medium">{label}</p>
      <div aria-hidden="true" className="space-y-3 motion-safe:animate-pulse">
        {["w-3/4", "w-full", "w-1/2"].map((width) => <div key={width} className={`h-4 rounded bg-muted ${width}`} />)}
      </div>
      <progress aria-label={label} className="h-1 w-full accent-secondary" />
      {(slow || forceSlow) ? <p role="status" className="text-sm leading-6 text-muted-foreground">This is taking longer than usual. You can keep browsing while we wait.</p> : null}
    </div>
  );
}
