import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** How long figures stay visible after "Show" before the filter comes back on its own. */
export const REVEAL_SECONDS = 30;
/** Pages with tabs give each tab its own, longer timer. */
export const TAB_REVEAL_SECONDS = 60;

type PrivacyState = { hidden: boolean; secondsLeft: number; reveal: () => void; hide: () => void };

// Without a provider everything stays hidden, so a missed provider fails safe.
const PrivacyContext = createContext<PrivacyState>({ hidden: true, secondsLeft: 0, reveal: () => {}, hide: () => {} });

/** Salary figures and HR notes start blurred; a user can lift the filter briefly. */
export const PrivacyFilterProvider = ({ children, seconds = REVEAL_SECONDS }: { children: ReactNode; seconds?: number }) => {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const reveal = useCallback(() => setSecondsLeft(seconds), [seconds]);
  const hide = useCallback(() => setSecondsLeft(0), []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // Switching tabs or locking the screen puts the filter straight back.
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) setSecondsLeft(0); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <PrivacyContext.Provider value={{ hidden: secondsLeft <= 0, secondsLeft, reveal, hide }}>
      {children}
    </PrivacyContext.Provider>
  );
};

/** Blurs its children while the filter is on. `block` wraps a whole section (forms included) instead of one value. */
export const Private = ({ children, block = false, className }: { children: ReactNode; block?: boolean; className?: string }) => {
  const { hidden } = useContext(PrivacyContext);
  const Tag = block ? "div" : "span";
  return (
    <Tag
      className={cn(hidden && "pointer-events-none select-none blur-sm", className)}
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      data-private={hidden ? "hidden" : "shown"}
    >
      {children}
    </Tag>
  );
};

export const PrivacyToggle = () => {
  const { hidden, secondsLeft, reveal, hide } = useContext(PrivacyContext);
  return hidden ? (
    <Button size="sm" variant="outline" onClick={reveal}>
      <Eye className="mr-1 h-4 w-4" /> Show figures
    </Button>
  ) : (
    <Button size="sm" variant="secondary" onClick={hide}>
      <EyeOff className="mr-1 h-4 w-4" /> Hide ({secondsLeft}s)
    </Button>
  );
};

/**
 * One tab's own filter. Tab content unmounts when you leave the tab, so coming back finds the
 * figures hidden, and "Show" starts a fresh 60s countdown for this tab alone.
 */
export const PrivacyScope = ({ children, toggle = true }: { children: ReactNode; toggle?: boolean }) => (
  <PrivacyFilterProvider seconds={TAB_REVEAL_SECONDS}>
    {toggle && <div className="mb-3 flex justify-end"><PrivacyToggle /></div>}
    {children}
  </PrivacyFilterProvider>
);
