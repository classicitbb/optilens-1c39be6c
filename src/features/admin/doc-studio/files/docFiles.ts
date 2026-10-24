/** Shared, framework-free helpers for Doc Studio's saved-file list. */

export type DocFileType = "email" | "letter" | "signature" | "social" | "shiplabel" | "statement" | "billing";
export type AccessFilter = "" | "owner" | "shared" | "edit" | "view" | "draft";
export type SortCol = "name" | "type" | "customer" | "date";

export interface DocFile {
  id: string;
  kind: "file" | "billing";
  fileType: string;
  fileName: string;
  customerName: string;
  updatedAt: string;
  isOwner: boolean;
  accessLevel: string;
  status: string;
  createdByCopilot: boolean;
  searchText: string;
}

export const TYPE_LABELS: Record<string, string> = {
  email: "Email", letter: "Letterhead", signature: "Signature", social: "Social",
  shiplabel: "Ship Label", statement: "Statement", billing: "Billing",
};

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

export function normalizeDocFile(raw: Raw): DocFile {
  const billing = raw.kind === "billing";
  return {
    id: str(raw.id),
    kind: billing ? "billing" : "file",
    fileType: billing ? "billing" : str(raw.fileType) || "email",
    fileName: str(raw.fileName) || (billing ? str(raw.documentName) || str(raw.billingNumber) : "") || "Untitled",
    customerName: str(raw.customerName) || str(raw.customerCompany),
    updatedAt: str(raw.latestAutosaveAt) || str(raw.updatedAt) || str(raw.createdAt),
    isOwner: Boolean(raw.isOwner),
    accessLevel: str(raw.accessLevel),
    status: str(raw.status),
    createdByCopilot: Boolean(raw.createdByCopilot),
    searchText: [raw.fileName, raw.documentName, raw.billingNumber, raw.customerName, raw.customerCompany, raw.customerAccount, raw.searchText]
      .map(str).join(" ").toLowerCase(),
  };
}

export function filterDocFiles(files: DocFile[], opts: { type?: string; access?: AccessFilter; search?: string }) {
  const q = (opts.search ?? "").trim().toLowerCase();
  return files.filter((f) => {
    if (opts.type && f.fileType !== opts.type) return false;
    switch (opts.access) {
      case "owner": if (!f.isOwner) return false; break;
      case "shared": if (f.isOwner) return false; break;
      case "edit": if (f.accessLevel !== "edit") return false; break;
      case "view": if (f.accessLevel !== "view") return false; break;
      case "draft": if (f.status !== "draft") return false; break;
    }
    return !q || f.searchText.includes(q) || f.fileName.toLowerCase().includes(q);
  });
}

export function sortDocFiles(files: DocFile[], col: SortCol, dir: 1 | -1) {
  const key = (f: DocFile) =>
    col === "date" ? f.updatedAt : col === "type" ? TYPE_LABELS[f.fileType] ?? f.fileType : col === "customer" ? f.customerName.toLowerCase() : f.fileName.toLowerCase();
  return [...files].sort((a, b) => (key(a) < key(b) ? -dir : key(a) > key(b) ? dir : 0));
}
