const TERMINAL_PUNCTUATION = /[.!?…]$/u;

export const formatVoiceTranscript = (value: string): string => {
  const normalized = value
    .replace(/\s+/gu, " ")
    .replace(/\s+([,.;:!?])/gu, "$1")
    .trim();
  if (!normalized) return "";

  const capitalized = normalized.replace(/^\p{Ll}/u, (letter) => letter.toUpperCase());
  return TERMINAL_PUNCTUATION.test(capitalized) ? capitalized : `${capitalized}.`;
};

export const isLikelyTranscriptionPromptEcho = (value: string, vocabulary: string): boolean => {
  const normalize = (text: string) => text
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  const transcript = normalize(value)
    .replace(/^(domain terms|domain vocabulary|likely domain terms)\s+/u, "");
  const hint = normalize(vocabulary);
  return Boolean(hint && transcript === hint);
};
