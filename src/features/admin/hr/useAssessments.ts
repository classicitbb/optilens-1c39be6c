export type KolbeMode = "fact_finder" | "follow_thru" | "quick_start" | "implementor";

export interface EmployeeAssessment {
  id: string;
  employee_id: string;
  framework: "kolbe_a";
  fact_finder: number;
  follow_thru: number;
  quick_start: number;
  implementor: number;
  assessed_on: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const KOLBE_MODES: { key: KolbeMode; label: string; hint: string }[] = [
  { key: "fact_finder", label: "Fact Finder", hint: "How you gather and share information" },
  { key: "follow_thru", label: "Follow Thru", hint: "How you organize and design" },
  { key: "quick_start", label: "Quick Start", hint: "How you deal with risk and uncertainty" },
  { key: "implementor", label: "Implementor", hint: "How you handle space and tangibles" },
];

/** Kolbe reads 1–3 as Prevent, 4–6 as Accommodate and 7–10 as Initiate. */
export const kolbeZone = (score: number) => (score <= 3 ? "Prevent" : score <= 6 ? "Accommodate" : "Initiate");
