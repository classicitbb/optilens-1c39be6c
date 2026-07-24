/**
 * Paginates statement transactions before printing.  The capacities leave room
 * for the Doc Studio statement header on page one and its closing/payment
 * blocks on the last page, so a row is never split by the browser print engine.
 */
export const paginateStatementLines = <T>(lines: T[]): T[][] => {
  const firstPageRows = 14;
  const finalPageRows = 18;
  const continuationPageRows = 30;

  if (lines.length <= firstPageRows) return [lines];

  const pages = [lines.slice(0, firstPageRows)];
  let remaining = lines.slice(firstPageRows);

  while (remaining.length > finalPageRows) {
    const rowsForThisPage = Math.min(continuationPageRows, remaining.length - finalPageRows);
    pages.push(remaining.slice(0, rowsForThisPage));
    remaining = remaining.slice(rowsForThisPage);
  }

  pages.push(remaining);
  return pages;
};
