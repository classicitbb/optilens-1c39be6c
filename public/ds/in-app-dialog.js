// In-app confirm/prompt for the legacy Doc Studio (window.__cvDialog). Embedded
// browsers such as the Claude desktop browser pane dismiss window.confirm and
// window.prompt silently, so those buttons looked dead. Plain-script twin of
// src/lib/inAppDialog.ts, which the bundled app uses.
(function registerInAppDialog() {
  function open(message, options, withInput, defaultValue) {
    options = options || {};
    return new Promise(function (resolve) {
      var previousFocus = document.activeElement;
      var overlay = document.createElement("div");
      overlay.setAttribute("data-annotate-ui", "");
      overlay.style.cssText = "position:fixed;inset:0;z-index:9100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.6)";
      var panel = document.createElement("div");
      panel.setAttribute("role", "alertdialog");
      panel.setAttribute("aria-modal", "true");
      panel.setAttribute("aria-label", message);
      panel.style.cssText = "width:100%;max-width:28rem;display:grid;gap:16px;padding:24px;border-radius:8px;border:1px solid #d6d3cb;background:#fff;color:#0b1e35;box-shadow:0 10px 30px rgba(0,0,0,.3);font:14px/1.5 'Plus Jakarta Sans',system-ui,sans-serif";
      var text = document.createElement("p");
      text.style.cssText = "margin:0;white-space:pre-line;font-weight:600;font-size:15px";
      text.textContent = message;
      panel.appendChild(text);

      var input = null;
      if (withInput) {
        input = document.createElement("input");
        input.value = defaultValue || "";
        input.style.cssText = "height:36px;padding:0 10px;border-radius:6px;border:1px solid #c9c5bb;background:#fff;color:inherit;font:inherit";
        panel.appendChild(input);
      }

      var buttonCss = "height:36px;padding:0 16px;border-radius:6px;font:inherit;font-weight:600;cursor:pointer";
      var cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = options.cancelLabel || "Cancel";
      cancel.style.cssText = buttonCss + ";border:1px solid #c9c5bb;background:transparent;color:inherit";
      var ok = document.createElement("button");
      ok.type = "button";
      ok.textContent = options.confirmLabel || (withInput ? "OK" : "Continue");
      ok.style.cssText = buttonCss + ";border:0;color:#fff;background:" + (options.destructive ? "#dc2626" : "#0b1e35");
      var footer = document.createElement("div");
      footer.style.cssText = "display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap";
      footer.appendChild(cancel);
      footer.appendChild(ok);
      panel.appendChild(footer);
      overlay.appendChild(panel);

      function close(value) {
        document.removeEventListener("keydown", onKey, true);
        overlay.remove();
        if (previousFocus && previousFocus.focus) previousFocus.focus();
        resolve(value);
      }
      function accept() { close(input ? input.value : "ok"); }
      function onKey(event) {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(null); }
        else if (event.key === "Enter" && (input ? document.activeElement === input : document.activeElement !== cancel)) {
          event.preventDefault(); event.stopPropagation(); accept();
        }
      }
      cancel.addEventListener("click", function () { close(null); });
      ok.addEventListener("click", accept);
      overlay.addEventListener("mousedown", function (event) { if (event.target === overlay) close(null); });
      document.addEventListener("keydown", onKey, true);
      document.body.appendChild(overlay);
      (input || ok).focus();
      if (input) input.select();
    });
  }

  window.__cvDialog = {
    confirm: function (message, options) { return open(message, options, false).then(function (v) { return v !== null; }); },
    prompt: function (message, defaultValue, options) { return open(message, options, true, defaultValue); },
  };
})();
