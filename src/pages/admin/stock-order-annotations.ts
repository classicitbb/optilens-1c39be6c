export const resolveStockOrderAnnotationTarget = (target: HTMLElement) => {
  const field = target.closest<HTMLElement>(".field");
  const control = target.closest<HTMLElement>("a, button, input, select, textarea, [role='button']");
  const element = field ?? control ?? target.closest<HTMLElement>("[data-annotatable]") ?? target;
  const fieldLabel = field?.querySelector("label")?.textContent?.replace(/\s+/g, " ").trim();
  const label = (element.getAttribute("aria-label") || fieldLabel || element.textContent || element.getAttribute("title") || "Stock order form")
    .replace(/\s+/g, " ").trim().slice(0, 80);

  return { element, label: label || "Stock order form" };
};
