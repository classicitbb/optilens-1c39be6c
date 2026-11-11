/**
 * Scrolls a form field into view, focuses it and flashes a ring around it so the eye lands on it.
 * The field may not exist yet (a tab or pop-up is still opening), so it keeps looking for a moment.
 */
export const focusField = (id: string, { attempts = 40 }: { attempts?: number } = {}) => {
  let tries = 0;
  const look = () => {
    const el = document.getElementById(id);
    if (!el) {
      if (tries++ < attempts) setTimeout(look, 50);
      return;
    }
    // A pop-up grabs focus as it opens; wait that out so ours is the one that sticks.
    const settle = el.closest('[role="dialog"]') ? 180 : 0;
    setTimeout(() => {
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView?.({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
      el.focus({ preventScroll: true });
      flash(el, reduceMotion);
    }, settle);
  };
  look();
};

const flash = (el: HTMLElement, reduceMotion: boolean) => {
  if (reduceMotion || !el.animate) {
    // No movement: hold a plain ring for a moment instead.
    const previous = el.style.boxShadow;
    el.style.boxShadow = "0 0 0 3px hsl(var(--primary) / 0.6)";
    setTimeout(() => { el.style.boxShadow = previous; }, 1600);
    return;
  }
  el.animate(
    [
      { boxShadow: "0 0 0 0 hsl(var(--primary) / 0.7)", backgroundColor: "hsl(var(--primary) / 0.18)" },
      { boxShadow: "0 0 0 7px hsl(var(--primary) / 0)", backgroundColor: "hsl(var(--primary) / 0)" },
    ],
    { duration: 650, iterations: 3, easing: "ease-out" },
  );
};
