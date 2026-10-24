// Keyboard flow for the Rx form: Enter moves to the next field, the way the
// previous form did. The order is simply the DOM order of the form's entry
// controls, so it follows the cards top to bottom and the Rx grid left to right,
// row by row. A control the person is not meant to type into (a locked or
// auto-estimated ED) sets tabindex -1 and is skipped, exactly as Tab skips it.

/** The controls Enter can land on. Buttons, checkboxes and the clip toggles are not data entry. */
const ENTRY =
  "input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=button]), select, button[role=combobox]";

export function entryControls(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(ENTRY)).filter(
    (el) =>
      !(el as HTMLInputElement).disabled
      && !(el as HTMLInputElement).readOnly
      && el.getAttribute("tabindex") !== "-1"
      && el.getAttribute("aria-hidden") !== "true"
      && !el.closest("[hidden]")
      // inside a collapsed <details> (the lens "Advanced" panel) nothing can take focus
      && !el.closest("details:not([open])"),
  );
}

/** The form this control belongs to. */
export const formRootOf = (el: Element): HTMLElement | null => el.closest<HTMLElement>("[data-rx-form]");

/**
 * Focus the next entry control after `from`. Returns whether focus moved. Does
 * nothing for a control outside the form (a dialog's search box) or the last one.
 */
export function advanceFrom(from: HTMLElement | null): boolean {
  if (!from) return false;
  const root = formRootOf(from);
  if (!root) return false;
  const list = entryControls(root);
  const next = list[list.indexOf(from) + 1];
  if (list.indexOf(from) < 0 || !next) return false;
  next.focus();
  if (next instanceof HTMLInputElement && next.type !== "number") next.select?.();
  return true;
}
