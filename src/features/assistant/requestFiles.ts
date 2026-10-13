/** Most files one support/contact request may carry (matches the server limit). */
export const MAX_REQUEST_FILES = 5;

/**
 * Files picked on the request form always go first; the most recent files shared
 * earlier in the chat fill any remaining slots. A chat file that can no longer be
 * read (e.g. restored after a pop-out) is skipped instead of blocking the request.
 */
export async function selectRequestFiles<A>(
  formFiles: File[],
  chatAttachments: A[],
  readChatFile: (attachment: A) => Promise<File>,
): Promise<File[]> {
  const slots = Math.max(0, MAX_REQUEST_FILES - formFiles.length);
  const recent = slots > 0 ? chatAttachments.slice(-slots) : [];
  const chatFiles = await Promise.all(recent.map((attachment) => readChatFile(attachment).catch(() => null)));
  return [...formFiles, ...chatFiles.filter((file): file is File => file !== null)].slice(0, MAX_REQUEST_FILES);
}
