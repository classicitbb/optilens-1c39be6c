export const clampPage = (page: number, itemCount: number, pageSize: number) => {
  const pageCount = Math.max(1, Math.ceil(itemCount / pageSize));
  return Math.min(Math.max(1, page), pageCount);
};

export const paginate = <T>(items: readonly T[], page: number, pageSize: number) => {
  const safePage = clampPage(page, items.length, pageSize);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageCount: Math.max(1, Math.ceil(items.length / pageSize)),
    start: items.length === 0 ? 0 : start + 1,
    end: Math.min(start + pageSize, items.length),
  };
};
