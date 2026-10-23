import { spreadsheetFormat } from "@/lib/spreadsheetPreview";

const IMAGE_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", jfif: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", bmp: "image/bmp" };
const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/jpg", "image/pjpeg", "image/gif", "image/webp", "image/bmp"]);
const TEXT_MIMES = new Set(["text/plain", "text/csv", "application/csv", "application/json"]);

export type PreviewKind = { kind: "image" | "pdf"; type: string } | { kind: "csv" | "text" | "xlsx" } | null;

/** Decide how to preview an attachment from its MIME type and/or file extension. */
export function attachmentPreviewKind(filename: string, mime: string | null | undefined): PreviewKind {
  const name = filename.toLowerCase();
  const type = (mime ?? "").toLowerCase().split(";")[0].trim();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
  if (type === "application/pdf" || ext === "pdf") return { kind: "pdf", type: "application/pdf" };
  if (IMAGE_TYPES[ext]) return { kind: "image", type: IMAGE_TYPES[ext] };
  if (IMAGE_MIMES.has(type)) return { kind: "image", type: type === "image/jpg" || type === "image/pjpeg" ? "image/jpeg" : type };
  if (spreadsheetFormat(filename, type) === "xlsx") return { kind: "xlsx" };
  if (/^html?$/.test(ext)) return null;
  if (TEXT_MIMES.has(type) || ["csv", "txt", "log", "json"].includes(ext)) return { kind: type.includes("csv") || ext === "csv" ? "csv" : "text" };
  return null;
}
