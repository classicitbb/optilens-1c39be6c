export interface PrintListSection<T> {
  key: string;
  label: string;
  rows: T[];
}

export interface PreparedPrintListChunk<T> {
  key: string;
  label: string;
  rows: T[];
  pageBreakBefore: boolean;
  isContinuation: boolean;
}

interface PrepareOptions {
  rowsPerPage?: number;
  minSplitThreshold?: number;
}

const rebalanceSmallTail = <T,>(chunks: T[][], minSplitThreshold: number) => {
  if (chunks.length < 2) return chunks;

  const lastChunk = chunks[chunks.length - 1];
  if (lastChunk.length >= minSplitThreshold) return chunks;

  const previousChunk = chunks[chunks.length - 2];
  const transferable = previousChunk.length - minSplitThreshold;
  if (transferable <= 0) return chunks;

  const need = minSplitThreshold - lastChunk.length;
  const moveCount = Math.min(need, transferable);
  if (moveCount <= 0) return chunks;

  const movedRows = previousChunk.splice(previousChunk.length - moveCount, moveCount);
  chunks[chunks.length - 1] = [...movedRows, ...lastChunk];
  return chunks;
};

const splitRowsIntoChunks = <T,>(rows: T[], rowsPerPage: number, minSplitThreshold: number): T[][] => {
  const chunks: T[][] = [];

  for (let i = 0; i < rows.length; i += rowsPerPage) {
    chunks.push(rows.slice(i, i + rowsPerPage));
  }

  return rebalanceSmallTail(chunks, minSplitThreshold);
};

export const preparePrintListChunks = <T,>(
  sections: PrintListSection<T>[],
  { rowsPerPage = 18, minSplitThreshold = 5 }: PrepareOptions = {},
): PreparedPrintListChunk<T>[] => {
  const prepared: PreparedPrintListChunk<T>[] = [];
  let remainingRowsOnPage = rowsPerPage;

  sections.forEach((section) => {
    if (!section.rows.length) return;

    const sectionChunks = splitRowsIntoChunks(section.rows, rowsPerPage, minSplitThreshold);
    const shouldBreakBeforeSection = remainingRowsOnPage < minSplitThreshold;

    sectionChunks.forEach((chunkRows, chunkIndex) => {
      const isContinuation = chunkIndex > 0;
      const rowsNeeded = chunkRows.length;

      let pageBreakBefore = isContinuation || (chunkIndex === 0 && shouldBreakBeforeSection);
      if (!pageBreakBefore && rowsNeeded > remainingRowsOnPage) {
        pageBreakBefore = true;
      }

      if (pageBreakBefore) {
        remainingRowsOnPage = rowsPerPage;
      }

      prepared.push({
        key: `${section.key}-${chunkIndex}`,
        label: section.label,
        rows: chunkRows,
        pageBreakBefore,
        isContinuation,
      });

      remainingRowsOnPage -= rowsNeeded;
      if (remainingRowsOnPage <= 0) {
        remainingRowsOnPage = rowsPerPage;
      }
    });
  });

  return prepared;
};
