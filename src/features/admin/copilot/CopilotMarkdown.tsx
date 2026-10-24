import { RichMarkdown } from "@/components/content/RichMarkdown";

interface CopilotMarkdownProps {
  content: string;
  className?: string;
  tone?: "assistant" | "user";
}

/**
 * Shared rich-text renderer for Copilot messages.
 * Delegates to RichMarkdown so tables, code, lists, and GFM render consistently.
 */
export function CopilotMarkdown({ content, className, tone = "assistant" }: CopilotMarkdownProps) {
  return <RichMarkdown content={content} className={className} tone={tone} />;
}

export default CopilotMarkdown;
