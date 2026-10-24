import { useEffect } from "react";

/**
 * Portaled popovers, menus and dialogs render outside `.admin-tool`. While any
 * admin shell is mounted this puts `ws-admin` on <body> so they resolve the
 * workspace theme (src/styles/workspace.css) and its scrollbar. Nested or
 * overlapping shells are counted so the class only leaves with the last one.
 */
let mounted = 0;

export function useAdminBodyClass() {
  useEffect(() => {
    mounted += 1;
    document.body.classList.add("ws-admin");
    return () => {
      mounted -= 1;
      if (mounted === 0) document.body.classList.remove("ws-admin");
    };
  }, []);
}
