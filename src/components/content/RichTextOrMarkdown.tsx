import ReactMarkdown from "react-markdown";

import SanitizedRichText from "@/components/content/SanitizedRichText";

interface RichTextOrMarkdownProps {
  content: string;
}

const RICH_TEXT_TAG = /<(?:a|blockquote|br|code|em|h[1-4]|li|ol|p|pre|strong|u|ul)\b[^>]*>/i;

/**
 * Renders current CMS rich-text HTML while retaining support for older
 * Markdown records and code-defined fallback copy.
 */
const RichTextOrMarkdown = ({ content }: RichTextOrMarkdownProps) => {
  if (RICH_TEXT_TAG.test(content)) {
    return <SanitizedRichText html={content} />;
  }

  return <ReactMarkdown>{content}</ReactMarkdown>;
};

export default RichTextOrMarkdown;
