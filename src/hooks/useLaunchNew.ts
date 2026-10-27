import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";

/**
 * Lets the admin "New" menu open a page's create mode via `?new=<value>`.
 * The param is consumed once so refresh/back doesn't reopen the dialog.
 * Pass `ready: false` while the page can't act yet (e.g. data still loading).
 */
export function useLaunchNew(onLaunch: (value: string) => void, ready = true) {
  const [params, setParams] = useSearchParams();
  const value = params.get("new");
  const handler = useRef(onLaunch);
  useEffect(() => {
    handler.current = onLaunch;
  });

  useEffect(() => {
    if (!value || !ready) return;
    handler.current(value);
    const next = new URLSearchParams(params);
    next.delete("new");
    setParams(next, { replace: true });
  }, [value, ready, params, setParams]);
}
