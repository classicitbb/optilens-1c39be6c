/**
 * Rule-based text tidy for ticket titles, replies and notes. Runs entirely in the
 * browser: no model, no network. It only makes mechanical fixes (spacing,
 * capitalisation, punctuation, apostrophes, doubled words) and never rewords.
 * Spelling is left to the browser's own spellcheck; real grammar errors
 * ("their" vs "there", agreement) are out of scope for rules.
 *
 * Anything that looks like data is protected and left exactly as typed:
 * tokens containing digits (Rx powers, SKUs, ticket numbers, prices), URLs,
 * emails, @mentions/#tags, `code`, and mixed-case words like iPhone.
 */

export type TidyKind = "sentence" | "title";

export interface TidyFix {
  label: string;
  count: number;
}

export interface TidyResult {
  text: string;
  fixes: TidyFix[];
  /** Total number of individual edits. */
  total: number;
}

// Protected text and list prefixes are swapped for one private-use character each
// (never typed, and not a letter, digit or space, so no rule touches them).
const SPAN_BASE = 0xe100;
const SPAN_LIMIT = 0xefff;
const MARKER_BASE = 0xf000;
const MARKER_LIMIT = 0xf8ff;
// Written as regex escapes (double backslash) so this source file stays plain ASCII.
const SPAN_CLASS = "[\\uE100-\\uEFFF]";
const MARKER_CLASS = "[\\uF000-\\uF8FF]";

const SPAN_RE = new RegExp(SPAN_CLASS, "gu");
const MARKER_RE = new RegExp(MARKER_CLASS, "gu");
// A line start: optional list-marker placeholder, then the first letter.
const LINE_START_RE = new RegExp(`(^|\\n)([ \\t]*(?:${MARKER_CLASS}[ \\t]+)?)(\\p{Ll})`, "gu");
const LIST_LINE_RE = new RegExp(`^\\s*${MARKER_CLASS}`, "u");
// A word, number or protected text ends here.
const WORDISH_END = "[\\p{L}\\p{N}\\uE100-\\uEFFF]";

const PROTECTED_PATTERNS: RegExp[] = [
  /`[^`\n]*`/gu,
  /(?:https?:\/\/|www\.)[^\s<>"]+/gu,
  /[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+/gu,
  /[@#][\p{L}\p{N}_-]+/gu,
  // Any token containing a digit, minus trailing sentence punctuation.
  /[^\s]*\d[^\s]*?(?=[.,;:!?)\]]*(?:\s|$))/gu,
  // camelCase / mixed-case words that start lowercase (iPhone, eBay).
  /\b\p{Ll}+\p{Lu}[\p{L}\p{N}]*\b/gu,
];

const LIST_MARKER_RE = /^[ \t]*(?:[-*+>]|\d+[.)]|#{1,6})(?=[ \t])/gmu;

const CONTRACTIONS: Record<string, string> = {
  dont: "don't", doesnt: "doesn't", didnt: "didn't", cant: "can't", wont: "won't",
  isnt: "isn't", arent: "aren't", wasnt: "wasn't", werent: "weren't", havent: "haven't",
  hasnt: "hasn't", hadnt: "hadn't", shouldnt: "shouldn't", wouldnt: "wouldn't",
  couldnt: "couldn't", mustnt: "mustn't", im: "I'm", ive: "I've", youre: "you're",
  theyre: "they're", weve: "we've", theyve: "they've", youve: "you've", thats: "that's",
  whats: "what's", wheres: "where's",
};

// A full stop after these does not end a sentence, so don't capitalise what follows.
const ABBREVIATIONS = new Set([
  "e.g", "i.e", "etc", "vs", "approx", "dr", "mr", "mrs", "ms", "st", "no", "inc", "ltd",
  "co", "corp", "est", "ref", "qty", "tel", "ext", "fig", "cf", "al",
]);

// Words that are legitimately doubled.
const ALLOWED_DOUBLES = new Set(["had", "that"]);

type Counter = { n: number };
/** `spans` are the protected texts the placeholders in the working string stand for. */
type Context = { spans: string[] };
type Rule = { label: string; kinds: TidyKind[]; apply: (text: string, counter: Counter, ctx: Context) => string };

const restore = (text: string, spans: string[], markers: string[] = []) =>
  text
    .replace(SPAN_RE, (char) => spans[char.charCodeAt(0) - SPAN_BASE] ?? "")
    .replace(MARKER_RE, (char) => markers[char.charCodeAt(0) - MARKER_BASE] ?? "");

const upperFirst = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const replaceCounting = (text: string, pattern: RegExp, counter: Counter, replacer: (...args: any[]) => string) =>
  text.replace(pattern, (...args) => {
    const next = replacer(...args);
    if (next !== args[0]) counter.n += 1;
    return next;
  });

const RULES: Rule[] = [
  {
    label: "Extra spaces",
    kinds: ["sentence", "title"],
    apply: (text, counter) => {
      let out = replaceCounting(text, /(?<=\S)[ \t]{2,}(?=\S)/gu, counter, () => " ");
      out = replaceCounting(out, /[ \t]+$/gmu, counter, () => "");
      return replaceCounting(out, /^[ \t]+/u, counter, () => "");
    },
  },
  {
    label: "Missing space after punctuation",
    kinds: ["sentence"],
    apply: (text, counter) => {
      let out = replaceCounting(text, /([,;])(?=\p{L})/gu, counter, (_match, mark: string) => `${mark} `);
      out = replaceCounting(out, /(?<=\p{L})([?!])(?=\p{L})/gu, counter, (_match, mark: string) => `${mark} `);
      // "word.Next" only; leaves file.pdf, e.g and domains alone.
      return replaceCounting(out, /(?<=\p{Ll}{2})\.(?=\p{Lu}\p{Ll})/gu, counter, () => ". ");
    },
  },
  {
    label: "Space before punctuation",
    kinds: ["sentence", "title"],
    apply: (text, counter) =>
      replaceCounting(text, new RegExp(`(?<=${WORDISH_END}) +([,;:.!?])(?=\\s|$)`, "gu"), counter, (_match, mark: string) => mark),
  },
  {
    label: "Apostrophes",
    kinds: ["sentence", "title"],
    apply: (text, counter) =>
      replaceCounting(text, /(?<![\p{L}\p{N}'’])(\p{L}+)(?![\p{L}\p{N}'’])/gu, counter, (match: string) => {
        const lower = match.toLowerCase();
        const fixed = CONTRACTIONS[lower];
        if (!fixed) return match;
        // Leave ALL CAPS alone (IM is a different thing); keep a leading capital.
        if (match === match.toUpperCase() && match.length > 1) return match;
        if (fixed.startsWith("I'")) return match === lower || match === upperFirst(lower) ? fixed : match;
        return match === upperFirst(lower) ? upperFirst(fixed) : match === lower ? fixed : match;
      }),
  },
  {
    label: "Lowercase I",
    kinds: ["sentence", "title"],
    apply: (text, counter) =>
      replaceCounting(
        text,
        /(?<![\p{L}\p{N}'’.\-/])i(?=['’](?:m|ll|ve|d)(?!\p{L})|[\s,;:!?]|$|\.(?!\p{L}))/gu,
        counter,
        () => "I",
      ),
  },
  {
    label: "Doubled words",
    kinds: ["sentence", "title"],
    apply: (text, counter) =>
      replaceCounting(text, /(?<![\p{L}\p{N}])(\p{L}{3,})([ \t]+)\1(?![\p{L}\p{N}])/giu, counter, (match: string, word: string) =>
        ALLOWED_DOUBLES.has(word.toLowerCase()) ? match : word),
  },
  {
    label: "Capitalisation",
    kinds: ["sentence", "title"],
    apply: (text, counter) => {
      // First letter of the text and of each line (after an optional list marker).
      let out = replaceCounting(
        text,
        LINE_START_RE,
        counter,
        (_match, start: string, lead: string, letter: string) => `${start}${lead}${letter.toUpperCase()}`,
      );
      // First letter after a sentence end, unless the full stop belongs to an abbreviation or initial.
      out = replaceCounting(
        out,
        /([.!?])(["'”’)\]]*)([ \t]+)(\p{Ll})/gu,
        counter,
        (match: string, mark: string, close: string, gap: string, letter: string, offset: number, whole: string) => {
          if (mark === ".") {
            if (whole[offset - 1] === ".") return match; // ellipsis
            const word = /([\p{L}.]+)$/u.exec(whole.slice(0, offset))?.[1]?.toLowerCase() ?? "";
            if (word.length === 1 || ABBREVIATIONS.has(word)) return match;
          }
          return `${mark}${close}${gap}${letter.toUpperCase()}`;
        },
      );
      return out;
    },
  },
  {
    label: "Closing full stop",
    kinds: ["sentence"],
    apply: (text, counter, ctx) => {
      const trimmed = text.replace(/\s+$/u, "");
      const lastLine = trimmed.slice(trimmed.lastIndexOf("\n") + 1);
      if (lastLine.trim().split(/\s+/u).length < 3) return text;
      if (LIST_LINE_RE.test(lastLine)) return text;
      // Only after a plain word: skips punctuated text, emoji, and data-like endings (Rx values, SKUs, ticket numbers).
      if (!/\p{L}$/u.test(trimmed)) return text;
      if (/(?:https?:\/\/|www\.)\S+$|\S+@\S+$/u.test(restore(lastLine, ctx.spans))) return text; // would break a link
      counter.n += 1;
      return `${trimmed}.${text.slice(trimmed.length)}`;
    },
  },
  {
    label: "Trailing full stop",
    kinds: ["title"],
    apply: (text, counter) =>
      replaceCounting(text, new RegExp(`(?<=${WORDISH_END})\\.$`, "u"), counter, () => ""),
  },
];

/** Tidy `input`. Returns the original text with no fixes when nothing needs changing. */
export const tidyText = (input: string, kind: TidyKind = "sentence"): TidyResult => {
  const spans: string[] = [];
  const markers: string[] = [];
  const normalised = input.replace(/\r\n/gu, "\n");

  let working = normalised;
  if (kind === "sentence") {
    working = working.replace(LIST_MARKER_RE, (match) => {
      markers.push(match);
      return String.fromCharCode(MARKER_BASE + markers.length - 1);
    });
  }
  for (const pattern of PROTECTED_PATTERNS) {
    working = working.replace(pattern, (match) => {
      spans.push(match);
      return String.fromCharCode(SPAN_BASE + spans.length - 1);
    });
  }
  // Absurdly large inputs would run out of placeholders; leave them alone.
  if (SPAN_BASE + spans.length > SPAN_LIMIT || MARKER_BASE + markers.length > MARKER_LIMIT) {
    return { text: input, fixes: [], total: 0 };
  }

  const fixes: TidyFix[] = [];
  for (const rule of RULES) {
    if (!rule.kinds.includes(kind)) continue;
    const counter: Counter = { n: 0 };
    working = rule.apply(working, counter, { spans });
    if (counter.n > 0) fixes.push({ label: rule.label, count: counter.n });
  }

  const text = restore(working, spans, markers);
  if (text === normalised || fixes.length === 0) return { text: input, fixes: [], total: 0 };
  return { text, fixes, total: fixes.reduce((sum, fix) => sum + fix.count, 0) };
};
