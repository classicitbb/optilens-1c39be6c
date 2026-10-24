// What a capture may be: a photo or a PDF. Pure helpers so the page stays simple.
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"] as const;
export const ACCEPT = "image/*,application/pdf";

export const isAcceptedFile = (f: File) => (ACCEPTED_TYPES as readonly string[]).includes(f.type);

export const extensionFor = (f: File): string =>
  f.type === "application/pdf" ? "pdf" : f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp"
    : f.type === "image/heic" || f.type === "image/heif" ? "heic" : "jpg";

/** Image / PDF files on the clipboard (a screenshot, a copied photo). */
export const filesFromClipboard = (data: DataTransfer | null): File[] =>
  Array.from(data?.items ?? []).filter((i) => i.kind === "file").map((i) => i.getAsFile()).filter((f): f is File => !!f && isAcceptedFile(f));
