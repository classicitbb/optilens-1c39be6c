import { useMemo, useState } from "react";
import type { PackageLine, PriceCatalogItem, ProposalSection, PublisherPrefillContext } from "../types";
import { DEFAULT_SECTIONS } from "../utils/sectionDefaults";

export const useProposalDraft = (prefill?: PublisherPrefillContext) => {
  const [lines, setLines] = useState<PackageLine[]>([]);
  const [sections, setSections] = useState<ProposalSection[]>(DEFAULT_SECTIONS);

  const addItem = (item: PriceCatalogItem) => {
    setLines((prev) => {
      const idx = prev.findIndex((x) => x.item.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { item, qty: 1 }];
    });
  };

  const removeItem = (id: string) => setLines((prev) => prev.filter((x) => x.item.id !== id));

  const updateQty = (id: string, qty: number) => {
    setLines((prev) => prev.map((x) => (x.item.id === id ? { ...x, qty: Math.max(1, qty || 1) } : x)));
  };

  const updateSection = (key: ProposalSection["key"], body: string) => {
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, body } : s)));
  };

  const total = useMemo(
    () => lines.reduce((acc, line) => acc + (line.item.unit_price ?? 0) * line.qty, 0),
    [lines]
  );

  return {
    lines,
    sections,
    addItem,
    removeItem,
    updateQty,
    updateSection,
    total,
    prefill,
  };
};
