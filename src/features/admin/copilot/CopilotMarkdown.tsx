import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface CopilotMarkdownProps {
  content: string;
  className?: string;
  tone?: "assistant" | "user";
}

/**
 * Shared rich-text renderer for Copilot messages.
 * Renders markdown (headings, lists, tables, code, links)
 * with the app's 0px-radius design language.
 */
export function CopilotMarkdown({ content, className, tone = "assistant" }: CopilotMarkdownProps) {
  const inverted = tone === "user";

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none text-sm leading-6",
        inverted ? "text-primary-foreground" : "text-foreground",
        "[&_p]:my-2 first:[&_p]:mt-0 last:[&_p]:mb-0",
        "[&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-base [&_h1]:font-semibold",
        "[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-[15px] [&_h2]:font-semibold",
        "[&_h3]:mb-1.5 [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold",
        "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_li]:leading-6",
        "[&_hr]:my-4 [&_hr]:border-border",
        "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic",
        "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs",
        "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold",
        "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:align-top",
        "[&_code]:rounded-none [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px] [&_code]:font-medium",
        inverted
          ? "[&_a]:text-primary-foreground [&_a]:underline [&_code]:bg-primary-foreground/15 [&_strong]:text-primary-foreground"
          : "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_code]:bg-muted [&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-none [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:text-[12px] [&_pre]:text-slate-100",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-slate-100",
        className,
      )}
    >
      <ReactMarkdown
        components={{
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer noopener" />,
          table: ({ node: _node, ...props }) => (
            <div className="my-3 overflow-x-auto border border-border">
              <table {...props} />
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default CopilotMarkdown;
