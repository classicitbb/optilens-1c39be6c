const spanOf = (cell: Element, attribute: "colspan" | "rowspan") => {
  const value = Number.parseInt(cell.getAttribute(attribute) ?? "1", 10);
  return Number.isFinite(value) && value > 1 ? Math.min(value, 100) : 1;
};

const unmergeTable = (table: HTMLTableElement) => {
  const rows = Array.from(table.rows);
  const grid: Element[][] = rows.map(() => []);

  rows.forEach((row, r) => {
    let c = 0;
    for (const cell of Array.from(row.cells)) {
      while (grid[r][c]) c += 1;
      const colspan = spanOf(cell, "colspan");
      const rowspan = Math.min(spanOf(cell, "rowspan"), rows.length - r);
      cell.removeAttribute("colspan");
      cell.removeAttribute("rowspan");
      for (let i = 0; i < rowspan; i += 1) {
        for (let j = 0; j < colspan; j += 1) {
          grid[r + i][c + j] = i === 0 && j === 0 ? cell : cell.cloneNode(true) as Element;
        }
      }
      c += colspan;
    }
  });

  rows.forEach((row, r) => row.replaceChildren(...grid[r].filter(Boolean)));
};

/**
 * The editor and the saved page only know plain cells, so a pasted table with merged cells would shift
 * text into the wrong columns on save. Split every merged cell into plain cells that repeat its content.
 */
export const unmergeTableCells = (html: string): string => {
  if (typeof DOMParser === "undefined" || !/(col|row)span/i.test(html)) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const tables = Array.from(doc.querySelectorAll("table")).filter((table) => table.querySelector("[colspan], [rowspan]"));
  if (tables.length === 0) return html;
  tables.forEach(unmergeTable);
  return doc.body.innerHTML;
};
