import { sanitizeRichTextHtml } from "@/lib/sanitizeRichTextHtml";

interface SanitizedRichTextProps {
  html: string;
}

/** Centralized rendering boundary for CMS-authored rich-text HTML. */
const SanitizedRichText = ({ html }: SanitizedRichTextProps) => (
  // eslint-disable-next-line no-restricted-syntax -- HTML is filtered through the shared allow-list sanitizer at this boundary.
  <div dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(html) }} />
);

export default SanitizedRichText;
