import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveStep, type TourDefinition } from "./index";

interface TourOverlayProps {
  tour: TourDefinition;
  initialStep: number;
  /** `completed` is true when the user finished the last step. */
  onClose: (completed: boolean, lastStep: number) => void;
  /** None of the tour's targets could be found on the page. */
  onNothingFound: () => void;
}

const CARD_WIDTH = 320;
const GAP = 12;
const PAD = 6;
// Targets can render a moment after navigation or a data load, so a step waits this long before it is skipped.
const WAIT_TRIES = 8;
const WAIT_MS = 150;

const findTarget = (target: string) => {
  const el = document.querySelector<HTMLElement>(`[data-tour="${CSS.escape(target)}"]`);
  return el && el.getClientRects().length > 0 ? el : null;
};

const sameRect = (a: DOMRect | null, b: DOMRect) =>
  !!a && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;

/** Spotlight + step card. The page stays clickable underneath so users can try what a step describes. */
const TourOverlay = ({ tour, initialStep, onClose, onNothingFound }: TourOverlayProps) => {
  const { steps } = tour;
  const [request, setRequest] = useState<{ index: number; dir: 1 | -1 }>({ index: Math.min(Math.max(initialStep, 0), steps.length - 1), dir: 1 });
  const [shown, setShown] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardHeight, setCardHeight] = useState(200);
  const cardRef = useRef<HTMLDivElement>(null);
  const shownRef = useRef<number | null>(null);
  shownRef.current = shown;
  const callbacks = useRef({ onClose, onNothingFound });
  callbacks.current = { onClose, onNothingFound };

  // Resolve the requested step: wait briefly for its target, then skip in the direction of travel.
  useEffect(() => {
    let tries = 0;
    let timer: number | undefined;
    const attempt = () => {
      if (findTarget(steps[request.index].target)) return setShown(request.index);
      if (++tries < WAIT_TRIES) {
        timer = window.setTimeout(attempt, WAIT_MS);
        return;
      }
      const next = resolveStep(steps, request.index + request.dir, request.dir, (target) => !!findTarget(target));
      if (next !== -1) return setShown(next);
      const current = shownRef.current;
      if (current === null) return callbacks.current.onNothingFound();
      // Nothing earlier to go back to: stay put. Nothing later: the tour is done.
      if (request.dir === 1) callbacks.current.onClose(true, current);
    };
    attempt();
    return () => window.clearTimeout(timer);
  }, [request, steps]);

  // Keep the spotlight on the target while the page scrolls, resizes or re-renders.
  useEffect(() => {
    if (shown === null) return;
    const el = findTarget(steps[shown].target);
    el?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    let frame = 0;
    const track = () => {
      const target = findTarget(steps[shown].target);
      if (target) {
        const next = target.getBoundingClientRect();
        setRect((prev) => (sameRect(prev, next) ? prev : next));
      }
      frame = window.requestAnimationFrame(track);
    };
    track();
    return () => window.cancelAnimationFrame(frame);
  }, [shown, steps]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
  }, [shown, rect]);

  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  const isLast = shown !== null && resolveStep(steps, shown + 1, 1, (target) => !!findTarget(target)) === -1;
  const next = () => {
    if (shown === null) return;
    if (isLast) onClose(true, shown);
    else setRequest({ index: shown + 1, dir: 1 });
  };
  const back = () => {
    if (shown !== null && shown > 0) setRequest({ index: shown - 1, dir: -1 });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose(false, shownRef.current ?? 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (shown === null || !rect) return null;
  const step = steps[shown];

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const width = Math.min(CARD_WIDTH, viewportW - GAP * 2);
  const below = rect.bottom + PAD + GAP + cardHeight <= viewportH;
  const above = rect.top - PAD - GAP - cardHeight >= 0;
  const top = below
    ? rect.bottom + PAD + GAP
    : above
      ? rect.top - PAD - GAP - cardHeight
      : Math.max(GAP, viewportH - cardHeight - GAP);
  const left = Math.min(Math.max(rect.left, GAP), viewportW - width - GAP);

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[10050]" data-tour-overlay={tour.id}>
      <div
        aria-hidden
        className="absolute rounded-lg transition-all duration-200"
        style={{
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          // Ring and dimmed page in one shadow (a Tailwind ring class would be overridden by this).
          boxShadow: "0 0 0 2px hsl(var(--primary)), 0 0 0 9999px rgb(0 0 0 / 0.55)",
        }}
      />
      <div
        ref={cardRef}
        role="dialog"
        aria-label={`${tour.title}: step ${shown + 1} of ${steps.length}`}
        tabIndex={-1}
        className="pointer-events-auto absolute rounded-lg border bg-popover p-4 text-popover-foreground shadow-xl outline-none transition-[top,left] duration-200"
        style={{ top, left, width }}
        onKeyDown={(event) => {
          if (event.target instanceof HTMLSelectElement) return;
          if (event.key === "ArrowRight") next();
          if (event.key === "ArrowLeft") back();
        }}
      >
        <div className="mb-2 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{tour.title}</p>
            <h2 className="text-sm font-semibold" aria-live="polite">{step.title}</h2>
          </div>
          <Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-7 w-7 shrink-0" aria-label="Exit tour" onClick={() => onClose(false, shown)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex items-center gap-2">
          <label className="sr-only" htmlFor="tour-step-picker">Jump to step</label>
          <select
            id="tour-step-picker"
            value={shown}
            onChange={(event) => setRequest({ index: Number(event.target.value), dir: 1 })}
            className="h-8 min-w-0 flex-1 truncate rounded-md border border-input bg-background px-2 text-xs"
          >
            {steps.map((s, i) => (
              <option key={s.target} value={i}>
                {i + 1} of {steps.length} · {s.title}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" className="h-8" onClick={back} disabled={shown === 0}>
            Back
          </Button>
          <Button size="sm" className="h-8" onClick={next}>
            {isLast ? "Finish" : "Next"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default TourOverlay;
