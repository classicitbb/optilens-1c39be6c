/**
 * Framework-free in-app confirm/prompt for the vanilla engines (legacy Rx order
 * engine, legacy Doc Studio). Embedded browsers such as the Claude desktop
 * browser pane dismiss window.confirm/prompt silently, so those buttons looked
 * dead. React code should use the useConfirm hook instead.
 */
export interface InAppDialogOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

function open(message: string, options: InAppDialogOptions, withInput: boolean, defaultValue = ""): Promise<string | null> {
  return new Promise((resolve) => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const overlay = document.createElement("div");
    overlay.setAttribute("data-annotate-ui", "");
    overlay.style.cssText = "position:fixed;inset:0;z-index:9100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.6)";
    const panel = document.createElement("div");
    panel.setAttribute("role", "alertdialog");
    panel.setAttribute("aria-modal", "true");
    panel.style.cssText = "width:100%;max-width:28rem;display:grid;gap:16px;padding:24px;border-radius:8px;border:1px solid hsl(var(--border));background:hsl(var(--background));color:hsl(var(--foreground));box-shadow:0 10px 30px rgba(0,0,0,.3);font:14px/1.5 system-ui,sans-serif";
    const text = document.createElement("p");
    text.style.cssText = "margin:0;white-space:pre-line;font-weight:600;font-size:15px";
    text.textContent = message;
    panel.setAttribute("aria-label", message);
    panel.append(text);

    let input: HTMLInputElement | null = null;
    if (withInput) {
      input = document.createElement("input");
      input.value = defaultValue;
      input.style.cssText = "height:36px;padding:0 10px;border-radius:6px;border:1px solid hsl(var(--input, var(--border)));background:hsl(var(--background));color:inherit;font:inherit";
      panel.append(input);
    }

    const buttonCss = "height:36px;padding:0 16px;border-radius:6px;font:inherit;font-weight:500;cursor:pointer";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = options.cancelLabel ?? "Cancel";
    cancel.style.cssText = `${buttonCss};border:1px solid hsl(var(--border));background:transparent;color:inherit`;
    const ok = document.createElement("button");
    ok.type = "button";
    ok.textContent = options.confirmLabel ?? (withInput ? "OK" : "Continue");
    ok.style.cssText = options.destructive
      ? `${buttonCss};border:0;background:hsl(var(--destructive));color:hsl(var(--destructive-foreground))`
      : `${buttonCss};border:0;background:hsl(var(--primary));color:hsl(var(--primary-foreground))`;
    const footer = document.createElement("div");
    footer.style.cssText = "display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap";
    footer.append(cancel, ok);
    panel.append(footer);
    overlay.append(panel);

    const close = (value: string | null) => {
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      previousFocus?.focus?.();
      resolve(value);
    };
    const accept = () => close(input ? input.value : "ok");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(null); }
      else if (event.key === "Enter" && (input ? document.activeElement === input : document.activeElement !== cancel)) {
        event.preventDefault(); event.stopPropagation(); accept();
      }
    };
    cancel.addEventListener("click", () => close(null));
    ok.addEventListener("click", accept);
    overlay.addEventListener("mousedown", (event) => { if (event.target === overlay) close(null); });
    document.addEventListener("keydown", onKey, true);
    document.body.append(overlay);
    (input ?? ok).focus();
    input?.select();
  });
}

export const inAppConfirm = (message: string, options: InAppDialogOptions = {}) =>
  open(message, options, false).then((value) => value !== null);

export const inAppPrompt = (message: string, defaultValue = "", options: InAppDialogOptions = {}) =>
  open(message, options, true, defaultValue);
