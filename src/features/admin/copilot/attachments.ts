import type { CopilotAttachment } from "./api";

export const MAX_ATTACHMENTS = 4;
export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
export const TEXT_TYPES = /^(text\/|application\/(json|csv|xml))/;

export const toBase64 = async (file: Blob) => {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let index = 0; index < buffer.length; index += 8192) {
    binary += String.fromCharCode(...buffer.subarray(index, index + 8192));
  }
  return btoa(binary);
};

export const buildAttachment = async (file: File): Promise<CopilotAttachment> => {
  const id = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`;
  const mimeType = file.type || "application/octet-stream";
  if (TEXT_TYPES.test(mimeType)) {
    return { id, name: file.name, mimeType, kind: "text", text: (await file.text()).slice(0, 20000) };
  }
  const data = await toBase64(file);
  if (mimeType.startsWith("image/")) {
    return { id, name: file.name, mimeType, kind: "image", data, previewUrl: URL.createObjectURL(file) };
  }
  return { id, name: file.name || "document.pdf", mimeType: "application/pdf", kind: "pdf", data };
};
